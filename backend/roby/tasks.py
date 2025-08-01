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

genai.configure(api_key=API_KEY)

@shared_task
def process_triage_request(patient_id, **kwargs):
    '''
    Defines an asynchronous Celery task to process a patient's recent
    triage and consultation data, send it to Gemini, and save the AI’s diagnosis.
    '''
    print(f"Processing triage request for patient {patient_id}")

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
                "temperature-Degrees C": str(record.temperature),
                "height-m": str(record.height),
                "weight-kg": str(record.weight),
                "pulse": str(record.pulse),
                "diastolic": str(record.diastolic),
                "systolic": str(record.systolic),
                "bmi": str(record.bmi),
                "notes": record.notes
            })

        for consultation in consultations:
            prompt_data["consultations"].append({
                "date": str(consultation.date_created),
                "note": consultation.note,
                "complaint": consultation.complaint,
                "disposition": consultation.disposition
            })

        logger.info(f"Processing triage request for patient {patient_id} with populated prompt_data: {prompt_data}")

        # Construct the prompt for Gemini
        triage_records_str = ""
        for record in prompt_data["triage_records"]:
            triage_records_str += f"- Date: {record['date']}, Temp: {record['temperature']}, Height: {record['height']}, Weight: {record['weight']}, Pulse: {record['pulse']}, BP: {record['systolic']}/{record['diastolic']}, BMI: {record['bmi']}, Notes: {record['notes']}\n"

        logger.info(f" Filtered triage records: {triage_records_str}")

        consultations_str = ""
        for consultation in prompt_data["consultations"]:
            consultations_str += f"- Date: {consultation['date']}, Complaint: {consultation['complaint']}, Note: {consultation['note']}, Disposition: {consultation['disposition']}\n"

        logger.info(f" Filtered triage consultation records: {consultations_str}")

        # Re-check for insufficient data after filtering
        if not prompt_data["triage_records"] and not prompt_data["consultations"]:
            message = "Triage records found were all empty or invalid."
            logger.warning(message)
            return
        
        prompt = f"Analyze the following patient data and suggest the most likely disease or condition. \nPatient Info:{prompt_data['patient_info']}\nTriage Records:\n{triage_records_str}\nConsultations:\n{consultations_str}\n\nProvide a concise answer with the likely condition and a brief justification."

        # Define our AI Model: 'gemini-1.5-flash'
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        gemini_response_content = response.text

        # Save the result
        TriageResult.objects.create(
            patient=patient,
            predicted_condition=gemini_response_content,
            gemini_response={"full_response": gemini_response_content}, # Not needed but kept here for good measure
            status='completed'
        )

    except Patient.DoesNotExist:
        print(f"Patient with ID {patient_id} not found.")
        TriageResult.objects.create(
            patient_id=patient_id, # Attempt to save with ID even if patient not found
            status='error',
            predicted_condition=f"Patient with ID {patient_id} not found."
        )
    except Exception as e:
        print(f"Error processing triage request for patient {patient_id}: {e}")
        TriageResult.objects.create(
            patient_id=patient_id, # Attempt to save with ID even if patient not found
            status='error',
            predicted_condition=f"Error: {e}"
        )