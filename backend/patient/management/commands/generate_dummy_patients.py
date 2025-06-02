import random
from datetime import date
from django.core.management.base import BaseCommand
from django.db import transaction
from faker import Faker

from patient.models import Patient, CustomUser, InsuranceCompany


class Command(BaseCommand):
    help = 'Generates dummy patient records with associated users and insurance companies.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--num_patients',
            type=int,
            default=10,
            help='The number of dummy patients to create.',
        )
        parser.add_argument(
            '--num_insurance_companies',
            type=int,
            default=5,
            help='The number of dummy insurance companies to ensure exist for linking.',
        )

    def handle(self, *args, **options):
        fake = Faker()
        num_patients = options['num_patients']
        num_insurance_companies = options['num_insurance_companies']

        self.stdout.write(self.style.SUCCESS(f"Starting generation of {num_patients} dummy patient records..."))

        # --- Step 1: Ensure sufficient Insurance Companies exist ---
        self.stdout.write(f"Checking for existing insurance companies and creating if fewer than {num_insurance_companies}...")
        existing_insurance_count = InsuranceCompany.objects.count()
        if existing_insurance_count < num_insurance_companies:
            companies_to_create = num_insurance_companies - existing_insurance_count
            for _ in range(companies_to_create):
                # Using unique.company() and truncating to max_length=30 for InsuranceCompany.name
                company_name = (fake.unique.company() + " Insurance")[:30]
                InsuranceCompany.objects.create(name=company_name)
            self.stdout.write(self.style.SUCCESS(f"Created {companies_to_create} new insurance companies."))
        else:
            self.stdout.write(f"Sufficient insurance companies ({existing_insurance_count}) already exist.")

        # Retrieve all insurance companies to link to patients
        insurance_companies = list(InsuranceCompany.objects.all())
        if not insurance_companies:
            self.stderr.write(self.style.ERROR("No insurance companies available. Cannot link patients to insurance. Please create some manually or increase --num_insurance_companies."))
            return

        patients_created = 0
        users_created = 0

        # --- Step 2: Generate Patients and CustomUsers within a transaction ---
        # Using a transaction ensures that if any part of the batch creation fails,
        # no incomplete data is left in the database.
        with transaction.atomic():
            for i in range(num_patients):

                first_name = fake.first_name()[:30]
                last_name = fake.last_name()[:30]
                
                # Generate a unique email for the CustomUser (and Patient)
                user_email = fake.unique.email()
                
                # Generate a random date of birth
                dob = fake.date_of_birth(minimum_age=1, maximum_age=90)

                # Truncate phone number to max_length=30 for CustomUser
                user_phone = fake.phone_number()[:30]

                # Create the CustomUser instance first
                try:
                    # Defensive truncation for role, though current values are short,
                    # to explicitly address character varying(20) error if it's related to this field.
                    user_role = CustomUser.PATIENT[:20]
                    user = CustomUser.objects.create_user(
                        email=user_email,
                        password='password123',  # A dummy password for the user
                        first_name=first_name,
                        last_name=last_name,
                        role=user_role,  # Assign the patient role
                        phone=user_phone,
                        date_of_birth=dob
                    )
                    users_created += 1
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"Error creating CustomUser '{user_email}': {e}. Skipping patient creation for this user."))
                    continue # Skip to the next patient if user creation fails

                # Truncate phone number to max_length=30 for Patient
                patient_phone = fake.phone_number()[:30]

                # Create the Patient record, linking to the newly created CustomUser
                try:
                    patient = Patient.objects.create(
                        first_name=first_name,
                        second_name=last_name,
                        date_of_birth=dob,
                        email=user_email, # Use the same unique email as the CustomUser
                        phone=patient_phone,
                        gender=random.choice(['M', 'F', 'O']),
                        user=user, # Link the CustomUser
                    )
                    
                    # Link random insurance companies to the patient
                    # A patient can have 0 to 3 insurance companies
                    num_insurances_for_patient = random.randint(0, min(3, len(insurance_companies)))
                    selected_insurances = random.sample(insurance_companies, num_insurances_for_patient)
                    patient.insurances.set(selected_insurances) # Use .set() for ManyToMany relationship

                    patients_created += 1
                    if (i + 1) % 10 == 0: # Provide progress updates every 10 patients
                        self.stdout.write(f"Generated {i + 1}/{num_patients} patients...")

                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"Error creating Patient record for user '{user_email}': {e}. Deleting associated CustomUser to prevent orphans."))
                    # If patient creation fails, delete the associated CustomUser to avoid orphaned users
                    if user:
                        user.delete()
                        users_created -= 1 # Decrement count as user was deleted
                    continue

        self.stdout.write(self.style.SUCCESS(f"\nFinished generating dummy data."))
        self.stdout.write(self.style.SUCCESS(f"Total Patients created: {patients_created}"))
        self.stdout.write(self.style.SUCCESS(f"Total CustomUsers created: {users_created}"))
