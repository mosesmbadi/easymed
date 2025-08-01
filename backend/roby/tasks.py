import google.generativeai as genai
import os
import logging
from dotenv import load_dotenv
from celery import shared_task
from django.apps import apps

logger = logging.getLogger(__name__)

# --- Configuration ---
# Load environment variables from .env file
load_dotenv()

# Get the API key from the environment variable
# It's recommended to store API keys in .env files or environment variables
# for security, rather than hardcoding them directly in the script.
API_KEY = os.getenv("GEMINI_API_KEY")

# Check if the API key was loaded successfully
if API_KEY is None:
    logger.error("API key not found. Please create a .env file in the same directory as this script with: GEMINI_API_KEY=\"YOUR_ACTUAL_API_KEY\"")
    # exit(1) # Do not exit in a Celery task, it will crash the worker

# Configure the API with your key
genai.configure(api_key=API_KEY)

@shared_task
def process_triage_request(patient_id, **kwargs):
    print(f"Processing triage request for patient {patient_id}")
    
    Patient = apps.get_model('patient', 'Patient')
    Triage = apps.get_model('patient', 'Triage')
    Consultation = apps.get_model('patient', 'Consultation')
    TriageResult = apps.get_model('roby', 'TriageResult')

    try:
        patient = Patient.objects.get(id=patient_id)
        triage_records = Triage.objects.filter(
            created_by=patient.user
        ).order_by('-date_created')[:5]
        consultations = Consultation.objects.filter(patient=patient).order_by('-date_created')[:5] # Last 5 consultations


        logger.info(f"Processing triage request for patient {patient_id} (unique_id: {patient.unique_id})")
        logger.info(f"Found {len(triage_records)} triage records and {len(consultations)} consultations.")

        if not triage_records and not consultations:
            # If no records are found, save an informative error and exit
            message = "No triage or consultation data found for this patient."
            TriageResult.objects.create(
                patient=patient,
                status='error',
                predicted_condition=message,
                gemini_response={"full_response": message}
            )
            logger.warning(message)
            return  # Exit the task
        
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
                "note": consultation.note,
                "complaint": consultation.complaint,
                "disposition": consultation.disposition
            })

        # Construct the prompt for Gemini
        triage_records_str = ""
        for record in prompt_data["triage_records"]:
            triage_records_str += f"- Date: {record['date']}, Temp: {record['temperature']}, Height: {record['height']}, Weight: {record['weight']}, Pulse: {record['pulse']}, BP: {record['systolic']}/{record['diastolic']}, BMI: {record['bmi']}, Notes: {record['notes']}\n"

        consultations_str = ""
        for consultation in prompt_data["consultations"]:
            consultations_str += f"- Date: {consultation['date']}, Complaint: {consultation['complaint']}, Note: {consultation['note']}, Disposition: {consultation['disposition']}\n"

        # Re-check for insufficient data after filtering
        if not prompt_data["triage_records"] and not prompt_data["consultations"]:
            message = "Triage records found were all empty or invalid."
            TriageResult.objects.create(
                patient=patient,
                status='error',
                predicted_condition=message,
                gemini_response={"full_response": message}
            )
            logger.warning(message)
            return
        
        prompt = f"Analyze the following patient data and suggest the most likely disease or condition. \nPatient Info: {prompt_data['patient_info']}\nTriage Records:\n{triage_records_str}\nConsultations:\n{consultations_str}\n\nProvide a concise answer with the likely condition and a brief justification."

        # Changed 'gemini-pro' to 'gemini-1.5-flash'
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        gemini_response_content = response.text

        # Save the result
        TriageResult.objects.create(
            patient=patient,
            predicted_condition=gemini_response_content,
            gemini_response={"full_response": gemini_response_content}, # Store full response if needed
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