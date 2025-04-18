from patient.models import Patient

def get_patient_details(patient: Patient):
    return {
        "patient_first_name": patient.first_name,
        "patient_second_name": patient.second_name,
        "patient_age": patient.age,
        "patient_gender": patient.gender,
    }
