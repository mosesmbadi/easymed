from django.core.management.base import BaseCommand
from customuser.management.utils.data_generators import (
    create_dummy_users,
    create_dummy_companies,
    create_dummy_insurance_companies,
    create_dummy_company_branches,
    create_dummy_items,
    create_permissions_and_groups,
    create_dummy_patients,
    create_demo_lab_profiles_and_panels,
)
from customuser.models import CustomUser
from company.models import Company, CompanyBranch, InsuranceCompany
from inventory.models import Item
from authperms.models import Permission, Group
from patient.models import Patient
from laboratory.models import LabTestProfile, LabTestPanel

class Command(BaseCommand):
    help = "Generate all dummy data (users, companies, etc.)"

    def handle(self, *args, **options):
        DEFAULT_COUNT = 50

        if CustomUser.objects.count() >= DEFAULT_COUNT:
            self.stdout.write(self.style.WARNING("Skipping users: already have 50 or more records."))
        else:
            users = create_dummy_users(count=DEFAULT_COUNT)
            self.stdout.write(self.style.SUCCESS(f"Created {len(users)} dummy users."))

        if Company.objects.count() >= DEFAULT_COUNT:
            self.stdout.write(self.style.WARNING("Skipping companies: already have 50 or more records."))
            companies = Company.objects.all()[:DEFAULT_COUNT]
        else:
            companies = create_dummy_companies(count=DEFAULT_COUNT)
            self.stdout.write(self.style.SUCCESS(f"Created {len(companies)} dummy companies."))

        if CompanyBranch.objects.count() >= DEFAULT_COUNT * DEFAULT_COUNT:
            self.stdout.write(self.style.WARNING("Skipping company branches: already have enough records."))
        else:
            total_branches = 0
            for company in companies:
                branches = create_dummy_company_branches(company, count=DEFAULT_COUNT)
                total_branches += len(branches)
            self.stdout.write(self.style.SUCCESS(f"Created {total_branches} dummy company branches."))

        if InsuranceCompany.objects.count() >= DEFAULT_COUNT:
            self.stdout.write(self.style.WARNING("Skipping insurance companies: already have 50 or more records."))
        else:
            insurance_companies = create_dummy_insurance_companies(count=DEFAULT_COUNT)
            self.stdout.write(self.style.SUCCESS(f"Created {len(insurance_companies)} dummy insurance companies."))

        if Item.objects.count() >= DEFAULT_COUNT:
                self.stdout.write(self.style.WARNING("Skipping items: already have 50 or more records."))
        else:
            items = create_dummy_items(count=DEFAULT_COUNT)
            self.stdout.write(self.style.SUCCESS(f"Created {len(items)} dummy inventory items."))

        if Group.objects.filter(name__in=[
                "SYS_ADMIN", "PATIENT", "DOCTOR", "PHARMACIST", "RECEPTIONIST", "LAB_TECH", "NURSE"
            ]).count() == 7 and Permission.objects.filter(name__in=[
                "CAN_ACCESS_DOCTOR_DASHBOARD",
                "CAN_ACCESS_GENERAL_DASHBOARD",
                "CAN_ACCESS_ADMIN_DASHBOARD",
                "CAN_ACCESS_RECEPTION_DASHBOARD",
                "CAN_ACCESS_NURSING_DASHBOARD",
                "CAN_ACCESS_LABORATORY_DASHBOARD",
                "CAN_ACCESS_PATIENTS_DASHBOARD",
                "CAN_ACCESS_AI_ASSISTANT_DASHBOARD",
                "CAN_ACCESS_ANNOUNCEMENT_DASHBOARD",
                "CAN_ACCESS_PHARMACY_DASHBOARD",
                "CAN_ACCESS_INVENTORY_DASHBOARD",
                "CAN_ACCESS_BILLING_DASHBOARD",
                "CAN_RECEIVE_INVENTORY_NOTIFICATIONS",
            ]).count() == 13:
                self.stdout.write(self.style.WARNING("Skipping groups/permissions: already set up."))
        else:
            create_permissions_and_groups()
            self.stdout.write(self.style.SUCCESS("Created default groups and permissions."))

        if Patient.objects.count() >= DEFAULT_COUNT:
            self.stdout.write(self.style.WARNING("Skipping patients: already have enough records."))
        else:
            insurance_companies = list(InsuranceCompany.objects.all())
            users = list(CustomUser.objects.filter(role=CustomUser.PATIENT))
            patients = create_dummy_patients(count=DEFAULT_COUNT, insurances=insurance_companies, users=users)
            self.stdout.write(self.style.SUCCESS(f"Created {len(patients)} dummy patients."))   
        
        if LabTestProfile.objects.exists() and LabTestPanel.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping lab test profiles/panels: already exist."))
        else:
            profiles, panels = create_demo_lab_profiles_and_panels()
            self.stdout.write(self.style.SUCCESS(f"Created {len(profiles)} lab test profiles and {len(panels)} panels."))    