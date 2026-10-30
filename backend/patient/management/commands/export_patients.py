import csv
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from patient.models import AttendanceProcess, Patient, Triage, Consultation, Prescription, PrescribedDrug, Referral
from laboratory.models import ProcessTestRequest, LabTestRequest

EXPORT_PATH = '/app/tmp/patient_events_export.csv'

class Command(BaseCommand):
    help = 'Export patient data and related events for AI/ML analysis.'

    def handle(self, *args, **options):
        now = timezone.now()
        year_ago = now - timedelta(days=365)
        
        fieldnames = [
            'patient_id', 'first_name', 'second_name', 'gender', 'age', 'insurances',
            'event_type', 'event_date',
            'drug', 'dosage', 'frequency', 'duration', 'prescription_note',
            'triage_temperature', 'triage_weight', 'triage_bmi',
            'consultation_note', 'consultation_complaint', 'consultation_fee', 'consultation_disposition',
            'lab_test_reference',
            'referral_service', 'referral_note', 'referral_email',
        ]

        with open(EXPORT_PATH, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for patient in Patient.objects.all():
                insurances = ','.join([str(i) for i in patient.insurances.all()])
                base = {
                    'patient_id': patient.unique_id,
                    'first_name': patient.first_name,
                    'second_name': patient.second_name,
                    'gender': patient.gender,
                    'age': patient.age,
                    'insurances': insurances,
                }

                # Prescriptions (last 1 year)
                for attendance in AttendanceProcess.objects.filter(patient=patient):
                    prescription = attendance.prescription
                    if prescription and prescription.created_by is not None and prescription.date_created >= year_ago:
                        for drug in PrescribedDrug.objects.filter(prescription=prescription):
                            row = base.copy()
                            row.update({
                                'event_type': 'prescription',
                                'event_date': prescription.date_created,
                                'drug': drug.item.name,
                                'dosage': drug.dosage,
                                'frequency': drug.frequency,
                                'duration': drug.duration,
                                'prescription_note': drug.note,
                            })
                            writer.writerow(row)
                            print(f"WROTE prescription row for patient {patient.unique_id} drug {drug.item.name}")

                # Triage (last 1 year)
                for triage in Triage.objects.filter(date_created__gte=year_ago, attendanceprocess__patient=patient):
                    row = base.copy()
                    row.update({
                        'event_type': 'triage',
                        'event_date': triage.date_created,
                        'triage_temperature': triage.temperature,
                        'triage_weight': triage.weight,
                        'triage_bmi': triage.bmi,
                    })
                    writer.writerow(row)
                    print(f"WROTE triage row for patient {patient.unique_id} at {triage.date_created}")

                # Consultations (last 1 year)
                for consult in Consultation.objects.filter(date_created__gte=year_ago, patient=patient):
                    row = base.copy()
                    row.update({
                        'event_type': 'consultation',
                        'event_date': consult.date_created,
                        'consultation_note': consult.note,
                        'consultation_complaint': consult.complaint,
                        'consultation_fee': consult.fee,
                        'consultation_disposition': consult.disposition,
                    })
                    writer.writerow(row)
                    print(f"WROTE consultation row for patient {patient.unique_id} at {consult.date_created}")

                # Lab tests (last 1 year)
                for attendance in AttendanceProcess.objects.filter(patient=patient):
                    process_test_req = attendance.process_test_req
                    if process_test_req:
                        for lab in LabTestRequest.objects.filter(process=process_test_req, created_on__gte=year_ago):
                            row = base.copy()
                            row.update({
                                'event_type': 'lab_test',
                                'event_date': lab.created_on,
                                'lab_test_reference': process_test_req.reference,
                            })
                            writer.writerow(row)
                            print(f"WROTE lab_test row for patient {patient.unique_id} at {lab.created_on}")

                # Referrals (last 1 year)
                for referral in Referral.objects.filter(date_created__gte=year_ago, email=patient.email):
                    row = base.copy()
                    row.update({
                        'event_type': 'referral',
                        'event_date': referral.date_created,
                        'referral_service': referral.service,
                        'referral_note': referral.note,
                        'referral_email': referral.email,
                    })
                    writer.writerow(row)
                    print(f"WROTE referral row for patient {patient.unique_id} at {referral.date_created}")

        self.stdout.write(self.style.SUCCESS(f'Exported patient events to {EXPORT_PATH}'))
