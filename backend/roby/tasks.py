import google.generativeai as genai
import os
from dotenv import load_dotenv # Import load_dotenv
from celery import shared_task
from django.apps import apps

# --- Configuration ---
# Load environment variables from .env file
load_dotenv()

# Get the API key from the environment variable
# It's recommended to store API keys in .env files or environment variables
# for security, rather than hardcoding them directly in the script.
API_KEY = os.getenv("GEMINI_API_KEY")

# Check if the API key was loaded successfully
if API_KEY is None:
    print("Error: GEMINI_API_KEY not found in environment variables or .env file.")
    print("Please create a .env file in the same directory as this script with: GEMINI_API_KEY=\"YOUR_ACTUAL_API_KEY\"")
    exit(1) # Exit the script if the API key is missing

# Configure the API with your key
genai.configure(api_key=API_KEY)

@shared_task
def process_triage_request(patient_id, **kwargs): # Added **kwargs here
    Patient = apps.get_model('patient', 'Patient')
    Triage = apps.get_model('patient', 'Triage')
    Consultation = apps.get_model('patient', 'Consultation')
    TriageResult = apps.get_model('roby', 'TriageResult')

    try:
        patient = Patient.objects.get(id=patient_id)
        triage_records = Triage.objects.filter(created_by=patient.unique_id).order_by('-date_created')[:5] # Last 5 triage records
        consultations = Consultation.objects.filter(patient=patient).order_by('-date_created')[:5] # Last 5 consultations

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

        for record in triage_records:
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
        prompt = f"Analyze the following patient data and suggest the most likely disease or condition. \nPatient Info: {prompt_data['patient_info']}\nTriage Records: {prompt_data['triage_records']}\nConsultations: {prompt_data['consultations']}\n\nProvide a concise answer with the likely condition and a brief justification."

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