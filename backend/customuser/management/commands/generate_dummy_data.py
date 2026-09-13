from django.core.management.base import BaseCommand
from customuser.management.utils.data_generators import (
    create_units,
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
    create_dummy_requisitions,
    create_real_world_lab_data,
    create_hospital_wards_and_beds,
    create_item_consumables,
    create_pharmaceutical_inventory,
    create_item_department_links,
    create_insurance_price_list,
)
from customuser.management.utils.demo_activity import (
    DEMO_DAYS,
    DemoClock,
    demo_start,
    seed_demo_world,
    seed_staff,
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
        # Everything is generated on the demo clock, which starts the morning
        # before the demo's history does. The catalogue, the opening stock and
        # the prices are dated then; the simulated visits move the clock
        # forward day by day until it reaches the real present. See
        # customuser/management/utils/demo_activity.py.
        with DemoClock(demo_start()) as clock:
            self._generate(clock)

    def _generate(self, clock):
        DEFAULT_COUNT = 50

        # Always ensure all units of measurement exist first
        units = create_units()
        self.stdout.write(self.style.SUCCESS(f"Ensured {len(units)} units of measurement."))

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

        # Departments come before items: items are tagged to the departments
        # that use them as they are created. get_or_create makes this idempotent,
        # so any department missing from an older database is filled in.
        create_dummy_departments()
        self.stdout.write(self.style.SUCCESS(f"Ensured {Department.objects.count()} departments."))

        if Item.objects.count() >= DEFAULT_COUNT:
                self.stdout.write(self.style.WARNING("Skipping items: already have 50 or more records."))
        else:
            items = create_dummy_items()
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

        # Staff straight after the groups they belong to: dashboards are gated
        # on group permissions, and everything after this -- requisitions,
        # visits, receipts -- needs somebody real to have done it. This is also
        # where the administrator comes from; nothing else creates one.
        staff = seed_staff()
        self.stdout.write(self.style.SUCCESS(
            f"Ensured {sum(len(v) for k, v in staff.items() if k != 'nurse_all')} staff accounts."))

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

        # create suppliers
        if Supplier.objects.count() >= DEFAULT_COUNT:
            self.stdout.write(self.style.WARNING("Skipping suppliers: already have 50 or more records."))
        else:
            suppliers = create_dummy_suppliers(count=DEFAULT_COUNT)
            self.stdout.write(self.style.SUCCESS(f"Created {len(suppliers)} dummy suppliers."))

        # Requisitions come after suppliers and items, since a line needs both,
        # plus the pack sizes that were seeded alongside the items.
        from inventory.models import Requisition
        if Requisition.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping requisitions: already exist."))
        else:
            requisitions = create_dummy_requisitions()
            self.stdout.write(self.style.SUCCESS(f"Created {len(requisitions)} dummy requisitions."))
        
        # Create real-world lab data (test profiles, panels, reagents, and links)
        from laboratory.models import TestPanelReagent
        if TestPanelReagent.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping real-world lab data: already exists."))
        else:
            try:
                lab_data = create_real_world_lab_data()
                self.stdout.write(self.style.SUCCESS(
                    f"Created real-world lab data: "
                    f"{len(lab_data['reagents'])} reagents, "
                    f"{len(lab_data['inventory_records'])} inventory records, "
                    f"{len(lab_data['panels'])} panels, "
                    f"{len(lab_data['links'])} reagent links, "
                    f"{len(lab_data['counters'])} stock counters"
                ))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error creating real-world lab data (non-fatal): {e}"))

        # Create reference values for lab test panels (runs after all panels are created)
        from laboratory.models import ReferenceValue
        reference_values = create_reference_values()
        if reference_values:
            self.stdout.write(self.style.SUCCESS(f"Created {len(reference_values)} reference values for lab test panels."))
        else:
            self.stdout.write(self.style.WARNING("Reference values: all up to date."))

        # Create lab test interpretations (runs after all panels are created)
        from laboratory.models import LabTestInterpretation
        interpretations = create_lab_test_interpretations()
        if interpretations:
            self.stdout.write(self.style.SUCCESS(f"Created {len(interpretations)} lab test interpretations for common tests."))
        else:
            self.stdout.write(self.style.WARNING("Lab test interpretations: all up to date."))

        # Price the service items (lab tests, appointments). Services hold no
        # stock, so they no longer need fake 9999-unit inventory rows just to
        # give billing a price to read.
        self.stdout.write(self.style.NOTICE("\nPricing service items..."))
        from decimal import Decimal

        from inventory.services import stock as stock_service

        service_categories = ['Lab Test', 'General Appointment', 'Specialized Appointment']
        priced_services = 0

        for category in service_categories:
            default_price = Decimal('1000.00') if 'Appointment' in category else Decimal('500.00')
            for item in Item.objects.filter(category=category):
                if not item.current_sale_price:
                    stock_service.set_sale_price(item, default_price)
                    priced_services += 1

        if priced_services > 0:
            self.stdout.write(self.style.SUCCESS(f"Priced {priced_services} service items"))
        else:
            self.stdout.write(self.style.WARNING("Service items already priced"))
        
        # Create hospital wards and beds
        from inpatient.models import Ward, Bed
        if Ward.objects.exists() and Bed.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping wards and beds: already exist."))
        else:
            ward_data = create_hospital_wards_and_beds()
            self.stdout.write(self.style.SUCCESS(
                f"Created hospital infrastructure: "
                f"{len(ward_data['wards'])} wards, "
                f"{len(ward_data['beds'])} beds"
            ))
        
        # Create comprehensive pharmaceutical inventory
        from inventory.models import StockBalance
        pharmacy_items_count = StockBalance.objects.filter(
            department__name='Pharmacy',
            item__category__in=['Drug', 'SurgicalEquipment'],
            quantity__gt=0,
        ).values('item').distinct().count()
        
        if pharmacy_items_count >= 50:
            self.stdout.write(self.style.WARNING("Skipping pharmaceutical inventory: already have sufficient stock."))
        else:
            pharma_data = create_pharmaceutical_inventory()
            self.stdout.write(self.style.SUCCESS(
                f"Created pharmaceutical inventory: "
                f"{len(pharma_data['items'])} items, "
                f"{len(pharma_data['inventory_records'])} inventory records"
            ))

        # Accompaniments need every item to exist first -- the syringe as much
        # as the injection that calls for it -- so this runs after the whole
        # catalogue is seeded.
        self.stdout.write(self.style.NOTICE("\nLinking items to their consumables..."))
        consumable_stats = create_item_consumables()
        self.stdout.write(self.style.SUCCESS(
            f"Linked {consumable_stats['items_linked']} items to consumables "
            f"({consumable_stats['total_links']} accompaniment links in total), "
            f"{consumable_stats['specimen_links_created']} specimen collection links, "
            f"lab stocked with {consumable_stats['lab_items_stocked']} collection items"
        ))

        # Tag every item to the departments that use it. Runs last so it also
        # catches items created along the way, such as each panel's billing item.
        self.stdout.write(self.style.NOTICE("\nLinking items to departments..."))
        link_stats = create_item_department_links()
        self.stdout.write(self.style.SUCCESS(
            f"Tagged {link_stats['tagged']} items to departments "
            f"({link_stats['already_tagged']} already tagged, "
            f"{link_stats['links']} item-department links in total)"
        ))

        # Agreed prices with the insurers the patients carry. Without them
        # every insured line falls back to cash and the insurer/co-pay split
        # never appears. Needs every item priced first, so it runs late.
        from inventory.models import InsuranceItemSalePrice
        if InsuranceItemSalePrice.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping insurance prices: already agreed."))
        else:
            insurance_stats = create_insurance_price_list()
            self.stdout.write(self.style.SUCCESS(
                f"Agreed {insurance_stats['prices']} insurance prices with "
                f"{insurance_stats['insurers']} insurers."
            ))

        # The history itself, last, once there is stock, prices, specimens,
        # staff and accounts for it to use.
        from patient.models import AttendanceProcess
        if AttendanceProcess.objects.exists():
            self.stdout.write(self.style.WARNING("Skipping demo history: patients already seen."))
        else:
            result = seed_demo_world(clock, staff, days=DEMO_DAYS)
            counts = result['counts']
            self.stdout.write(self.style.SUCCESS(
                f"Simulated {DEMO_DAYS} days: {counts.get('visits', 0)} visits, "
                f"{counts.get('invoice lines billed', 0)} invoice lines, "
                f"{counts.get('patient receipts', 0)} patient receipts, "
                f"{counts.get('admissions', 0)} admissions."
            ))
            if result['refused']:
                self.stdout.write(self.style.ERROR(
                    f"{len(result['refused'])} steps were refused by the billing or stock "
                    f"rules and rolled back -- see above."
                ))
