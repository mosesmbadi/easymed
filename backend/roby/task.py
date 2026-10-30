import google.generativeai as genai
import os
import logging
from dotenv import load_dotenv
from celery import shared_task
from django.apps import apps

from .models import TriageResult
from patient.models import Patient, Triage, Consultation


logger = logging.getLogger(__name__)

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY is None:
    logger.error("API key not found. Please create a .env file in the same directory as this script with: GEMINI_API_KEY=\"YOUR_ACTUAL_API_KEY\"")
else:
    genai.configure(api_key=API_KEY)

@shared_task
def process_triage_request(patient_id, **kwargs):
    '''
    Defines an asynchronous Celery task to process a patient's recent
    triage and consultation data, send it to Gemini, and save the AI's diagnosis.
    '''
    print(f"Processing triage request for patient {patient_id}")

    # Check if API key is available
    if API_KEY is None:
        logger.warning("GEMINI_API_KEY not available, skipping AI processing")
        return

    try:
        # Fetch Patient and Their Records
        patient = Patient.objects.get(id=patient_id)
        triage_records = Triage.objects.filter(
            patient=patient
        ).order_by('-date_created')[:5]
        consultations = Consultation.objects.filter(
            patient=patient
            ).order_by('-date_created')[:5] # Last 5 consultations


        logger.info(f"Processing triage request for patient:{patient_id} With records: {triage_records}")
        
        # Check if there are enough records
        if len(triage_records) < 2 or len(consultations) < 2:
            message = "Insufficient data: At least two triage records and two consultation records are required."
            TriageResult.objects.create(
                patient=patient,
                status='error',
                predicted_condition=message,
                gemini_response={"full_response": message}
            )
            logger.warning(message)
            return
        
        # Prepares a structured dictionary to represent the patient's key information
        prompt_data = {
            "patient_info": {
                "first_name": patient.first_name,
                "second_name": patient.second_name,
                "age": patient.age,
                "gender": patient.gender,
            },
            "triage_records": [],
            "consultations": []
        }

        logger.info(f"Processing triage request for patient {patient_id} with {prompt_data}")

        # Add triage records and consultations to the prompt_data 
        for record in triage_records:
            if record.temperature is None and record.height is None and record.weight is None and record.notes is None:
                continue
            prompt_data["triage_records"].append({
                "date": str(record.date_created),
                "temperature": str(record.temperature),
                "height": str(record.height),
                "weight": str(record.weight),
                "pulse": str(record.pulse),
                "diastolic": str(record.diastolic),
                "systolic": str(record.systolic),
                "bmi": str(record.bmi),
                "notes": record.notes
            })

        for consultation in consultations:
            prompt_data["consultations"].append({
                "date": str(consultation.date_created),
                "diagnosis": consultation.diagnosis,
                "doctors_note": consultation.doctors_note,
                "signs_and_symptoms": consultation.signs_and_symptoms
            })

        logger.info(f"Processing triage request for patient {patient_id} with populated prompt_data: {prompt_data}")

        # Construct the prompt for Gemini
        triage_records_str = ""
        for record in prompt_data["triage_records"]:
            triage_records_str += f"- Date: {record['date']}, Temp: {record['temperature']}°C, Height: {record['height']}m, Weight: {record['weight']}kg, Pulse: {record['pulse']}, BP: {record['systolic']}/{record['diastolic']}, BMI: {record['bmi']}, Notes: {record['notes']}\n"

        logger.info(f" Filtered triage records: {triage_records_str}")

        consultations_str = ""
        for consultation in prompt_data["consultations"]:
            consultations_str += f"- Date: {consultation['date']}, Diagnosis: {consultation['diagnosis']}, Doctors Note: {consultation['doctors_note']}, Signs and Symptoms: {consultation['signs_and_symptoms']}\n"

        logger.info(f" Filtered triage consultation records: {consultations_str}")

        # Re-check for insufficient data after filtering
        if not prompt_data["triage_records"] and not prompt_data["consultations"]:
            message = "Triage records found were all empty or invalid."
            logger.warning(message)
            return
        
        prompt = f"Analyze the following patient data and suggest the most likely disease or condition. \nPatient Info:{prompt_data['patient_info']}\nTriage Records:\n{triage_records_str}\nConsultations:\n{consultations_str}\n\nProvide a concise answer with the likely condition and a brief justification."

        # Define our AI Model - try different model names
        model_names = [
            'models/gemini-flash-latest',
            'models/gemini-pro-latest',
            'models/gemini-2.5-flash',
            'models/gemini-2.5-pro',
            'models/gemini-2.0-flash'
        ]
        gemini_response_content = None
        
        for model_name in model_names:
            try:
                logger.info(f"Trying model: {model_name}")
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                gemini_response_content = response.text
                logger.info(f"Successfully used model: {model_name}")
                break
            except Exception as model_error:
                logger.warning(f"Model {model_name} failed: {str(model_error)}")
                continue
        
        if gemini_response_content is None:
            # Try to list available models for debugging
            try:
                models = genai.list_models()
                available_models = [model.name for model in models]
                logger.error(f"Available models: {available_models}")
                raise Exception(f"All model attempts failed. Available models: {available_models}")
            except Exception as list_error:
                logger.error(f"Failed to list models: {str(list_error)}")
                raise Exception(f"All model attempts failed and couldn't list available models: {str(list_error)}")

        # Save the result
        TriageResult.objects.create(
            patient=patient,
            predicted_condition=gemini_response_content,
            gemini_response={"full_response": gemini_response_content}, # Not needed but kept here for good measure
            status='completed'
        )

    except Patient.DoesNotExist:
        logger.error(f"Patient with ID {patient_id} does not exist.")
    except Exception as e:
        logger.error(f"Error processing triage request for patient {patient_id}: {str(e)}")
        try:
            patient = Patient.objects.get(id=patient_id)
            TriageResult.objects.create(
                patient=patient,
                status='error',
                predicted_condition=f"Error occurred: {str(e)}",
                gemini_response={"error": str(e)}
            )
        except:
            logger.error(f"Failed to save error state for patient {patient_id}")