from django.core.management.base import BaseCommand
from customuser.management.utils.data_generators import (
    create_dummy_users,
    create_dummy_companies,
    create_dummy_insurance_companies,
    create_dummy_company_branches,
    create_dummy_items,
    create_appointment_items,
    create_permissions_and_groups,
    create_dummy_patients,
    create_demo_lab_profiles_and_panels,
    create_reference_values,
    create_lab_test_interpretations,
    create_dummy_departments,
    create_dummy_suppliers,
    create_real_world_lab_data
)
from customuser.models import CustomUser
from company.models import Company, CompanyBranch, InsuranceCompany
from inventory.models import Item, Department, Supplier
from authperms.models import Permission, Group
from patient.models import Patient
from laboratory.models import LabTestProfile, LabTestPanel

class Command(BaseCommand):
    '''
    Command to generate dummy data for development and testing.
    python manage.py generate_dummy_data
    '''
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
        
        # Create appointment items separately
        if Item.objects.filter(category__in=['General Appointment', 'Specialized Appointment']).exists():
            self.stdout.write(self.style.WARNING("Skipping appointment items: already exist."))
        else:
            appointment_items = create_appointment_items()
            self.stdout.write(self.style.SUCCESS(f"Created {len(appointment_items)} appointment items (1 General, 4 Specialized)."))

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
        
        # Create reference values for lab test panels
        from laboratory.models import ReferenceValue
        if ReferenceValue.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping reference values: already exist."))
        else:
            reference_values = create_reference_values()
            self.stdout.write(self.style.SUCCESS(f"Created {len(reference_values)} reference values for lab test panels."))
        
        # Create lab test interpretations
        from laboratory.models import LabTestInterpretation
        if LabTestInterpretation.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping lab test interpretations: already exist."))
        else:
            interpretations = create_lab_test_interpretations()
            self.stdout.write(self.style.SUCCESS(f"Created {len(interpretations)} lab test interpretations for common tests."))

        # create departments
        if Department.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping departments: already exist."))
        else:
            create_dummy_departments()
            self.stdout.write(self.style.SUCCESS(f"Created {len(Department.objects.all())} departments."))
        
        # create suppliers
        if Supplier.objects.count() >= DEFAULT_COUNT:
            self.stdout.write(self.style.WARNING("Skipping suppliers: already have 50 or more records."))
        else:
            suppliers = create_dummy_suppliers(count=DEFAULT_COUNT)
            self.stdout.write(self.style.SUCCESS(f"Created {len(suppliers)} dummy suppliers."))
        
        # Create real-world lab data (test profiles, panels, reagents, and links)
        from laboratory.models import TestPanelReagent, TestKitCounter
        if TestPanelReagent.objects.exists() and TestKitCounter.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping real-world lab data: already exists."))
        else:
            lab_data = create_real_world_lab_data()
            self.stdout.write(self.style.SUCCESS(
                f"Created real-world lab data: "
                f"{len(lab_data['reagents'])} reagents, "
                f"{len(lab_data['inventory_records'])} inventory records, "
                f"{len(lab_data['panels'])} panels, "
                f"{len(lab_data['links'])} reagent links, "
                f"{len(lab_data['counters'])} stock counters"
            ))
        
        # Ensure all service items (lab tests, appointments) have inventory
        self.stdout.write(self.style.NOTICE("\nEnsuring service items have inventory records..."))
        from inventory.models import Inventory
        from decimal import Decimal
        from datetime import date, timedelta
        
        service_dept, _ = Department.objects.get_or_create(name='General')
        service_categories = ['Lab Test', 'General Appointment', 'Specialized Appointment']
        created_service_inv = 0
        
        for category in service_categories:
            items = Item.objects.filter(category=category)
            for item in items:
                if not Inventory.objects.filter(item=item).exists():
                    default_price = Decimal('1000.00') if 'Appointment' in category else Decimal('500.00')
                    Inventory.objects.create(
                        item=item,
                        department=service_dept,
                        purchase_price=Decimal('0.00'),
                        sale_price=default_price,
                        quantity_at_hand=9999,
                        category_one='Internal',
                        lot_number='SERVICE-001',
                        expiry_date=date.today() + timedelta(days=365 * 2)
                    )
                    created_service_inv += 1
        
        if created_service_inv > 0:
            self.stdout.write(self.style.SUCCESS(f"Created {created_service_inv} service inventory records"))
        else:
            self.stdout.write(self.style.WARNING("Service items already have inventory"))