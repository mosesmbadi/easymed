import os
import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.utils import timezone
from faker import Faker
from django.core.validators import FileExtensionValidator 

from customuser.models import (
    CustomUser, DoctorProfile, NurseProfile, SysadminProfile,
    LabTechProfile, ReceptionistProfile
)
from company.models import Company, CompanyBranch, InsuranceCompany 
from inventory.models import (
    Department, Supplier, Item, Requisition, RequisitionItem,
    PurchaseOrder, PurchaseOrderItem, SupplierInvoice, GoodsReceiptNote,
    IncomingItem, Inventory, InventoryArchive, InsuranceItemSalePrice,
    DepartmentInventory, QuotationCustomer, Quotation, QuotationItem
)
from authperms.models import Group, Permission 
from company.models import PaymentMode 


User = CustomUser 
fake = Faker('en_US') 


class Command(BaseCommand):
    help = 'Generates dummy data for various hospital management models using Faker.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=20,
            help='Number of dummy users to create.',
        )
        parser.add_argument(
            '--companies',
            type=int,
            default=5,
            help='Number of dummy main companies to create.',
        )
        parser.add_argument(
            '--branches',
            type=int,
            default=10,
            help='Number of dummy company branches to create.',
        )
        parser.add_argument(
            '--insurance_companies',
            type=int,
            default=5,
            help='Number of dummy insurance companies to create.',
        )
        parser.add_argument(
            '--departments',
            type=int,
            default=7,
            help='Number of dummy departments to create.',
        )
        parser.add_argument(
            '--suppliers',
            type=int,
            default=15,
            help='Number of dummy suppliers to create.',
        )
        parser.add_argument(
            '--items',
            type=int,
            default=75,
            help='Number of dummy inventory items to create.',
        )
        parser.add_argument(
            '--requisitions',
            type=int,
            default=30,
            help='Number of dummy requisitions to create.',
        )
        parser.add_argument(
            '--purchase_orders',
            type=int,
            default=25,
            help='Number of dummy purchase orders to create.',
        )
        parser.add_argument(
            '--invoices',
            type=int,
            default=20,
            help='Number of dummy supplier invoices to create.',
        )
        parser.add_argument(
            '--grn',
            type=int,
            default=20,
            help='Number of dummy goods receipt notes to create.',
        )
        parser.add_argument(
            '--incoming_items',
            type=int,
            default=50,
            help='Number of dummy incoming items to create.',
        )
        parser.add_argument(
            '--inventory_records',
            type=int,
            default=60,
            help='Number of dummy inventory records to create.',
        )
        parser.add_argument(
            '--quotations',
            type=int,
            default=20,
            help='Number of dummy quotations to create.',
        )
        parser.add_argument(
            '--clear-data',
            action='store_true',
            help='Delete existing data before generating new data.',
        )


    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting dummy data generation..."))

        num_users = options['users']
        num_companies = options['companies']
        num_branches = options['branches']
        num_insurance_companies = options['insurance_companies']
        num_departments = options['departments']
        num_suppliers = options['suppliers']
        num_items = options['items']
        num_requisitions = options['requisitions']
        num_po = options['purchase_orders']
        num_invoices = options['invoices']
        num_grn = options['grn']
        num_incoming_items = options['incoming_items']
        num_inventory = options['inventory_records']
        num_quotations = options['quotations']
        clear_data = options['clear_data']

        if clear_data:
            self.stdout.write(self.style.WARNING("Clearing existing data..."))
            self._clear_all_data()
            self.stdout.write(self.style.SUCCESS("Existing data cleared."))

        # --- 0. Groups and Permissions (Optional, but good for CustomUser) ---
        groups = list(Group.objects.all())
        if not groups:
            self.stdout.write(self.style.MIGRATE_HEADING("No existing groups found. Creating some dummy groups."))
            for i in range(3): 
                group, created = Group.objects.get_or_create(name=f"DummyGroup{i+1}")
                if created:
                    groups.append(group)
        
        # --- 1. CustomUser ---
        users = []
        available_roles = [role_tuple[0] for role_tuple in CustomUser.ROLE_CHOICES]
        
        existing_users_count = User.objects.count()
        if existing_users_count < num_users:
            users_to_create = num_users - existing_users_count
            self.stdout.write(self.style.MIGRATE_HEADING(f"Creating {users_to_create} new CustomUsers..."))
            for i in range(users_to_create):
                role = random.choice(available_roles)
                try:
                    user_email = fake.unique.email()
                    user, created = User.objects.get_or_create(
                        email=user_email,
                        defaults={ 
                            'password': 'password123', 
                            'first_name': fake.first_name(),
                            'last_name': fake.last_name(),
                            'phone': fake.phone_number(),
                            'date_of_birth': fake.date_of_birth(minimum_age=18, maximum_age=70),
                            'role': role,
                            'profession': fake.job() if role not in [CustomUser.PATIENT, CustomUser.SYS_ADMIN] else None,
                            'group': random.choice(groups) if groups and fake.boolean(chance_of_getting_true=50) else None
                        }
                    )
                    
                    if created:
                        users.append(user)
                        # Create associated profile if applicable, only for newly created users
                        if role == CustomUser.DOCTOR:
                            DoctorProfile.objects.get_or_create(user=user)
                        elif role == CustomUser.NURSE or role == CustomUser.SENIOR_NURSE:
                            NurseProfile.objects.get_or_create(user=user)
                        elif role == CustomUser.SYS_ADMIN:
                            SysadminProfile.objects.get_or_create(user=user)
                        elif role == CustomUser.LAB_TECH:
                            LabTechProfile.objects.get_or_create(user=user)
                        elif role == CustomUser.RECEPTIONIST:
                            ReceptionistProfile.objects.get_or_create(user=user)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Could not create user or profile: {e}"))
            self.stdout.write(self.style.SUCCESS(f"Created {len(users)} new CustomUsers and their profiles (if applicable)."))
        else:
            self.stdout.write(self.style.MIGRATE_HEADING(f"Using existing {existing_users_count} CustomUsers."))
        
        users = list(User.objects.all()) 
        if not users:
            raise CommandError("No CustomUsers available. Please ensure your CustomUser model is properly set up and you have some users (or allow the command to create them).")


        # --- 2. Company ---
        companies = []
        for _ in range(num_companies):
            company, created = Company.objects.get_or_create(
                name=fake.unique.company(),
                defaults={
                    'address1': fake.address(),
                    'phone1': fake.phone_number(),
                    'email1': fake.unique.company_email(),
                }
            )
            companies.append(company)
        self.stdout.write(self.style.SUCCESS(f"Created {len(companies)} Companies."))

        # --- 3. CompanyBranch ---
        branches = []
        if not companies:
            self.stdout.write(self.style.WARNING("No main companies available. Skipping CompanyBranch creation."))
        else:
            for _ in range(num_branches):
                branch, created = CompanyBranch.objects.get_or_create(
                    name=fake.unique.city() + " Branch",
                    company=random.choice(companies),
                    defaults={
                        'address': fake.address(),
                        'phone': fake.phone_number(),
                        'email': fake.unique.email(),
                    }
                )
                branches.append(branch)
        self.stdout.write(self.style.SUCCESS(f"Created {len(branches)} CompanyBranches."))

        # --- 4. InsuranceCompany ---
        insurance_companies = []
        # Max length for name is 30, so truncate Faker's output
        MAX_INSURANCE_COMPANY_NAME_LENGTH = 30 
        for _ in range(num_insurance_companies):
            # Generate a company name and ensure it fits the max_length
            company_name_base = fake.unique.company()
            company_name_full = f"{company_name_base} Insurance"
            # Truncate if necessary, leaving space for " Insurance" or just the base
            if len(company_name_full) > MAX_INSURANCE_COMPANY_NAME_LENGTH:
                # Try to fit by truncating base, then adding " Ins"
                if len(company_name_base) > MAX_INSURANCE_COMPANY_NAME_LENGTH - 4: # 4 for " Ins"
                    company_name = company_name_base[:MAX_INSURANCE_COMPANY_NAME_LENGTH - 4] + " Ins"
                else: # Should not happen if base was short, but as fallback
                    company_name = company_name_base[:MAX_INSURANCE_COMPANY_NAME_LENGTH] 
            else:
                company_name = company_name_full
            
            # Ensure uniqueness after truncation
            unique_name_found = False
            attempts = 0
            while not unique_name_found and attempts < 10: # Limit attempts to prevent infinite loop
                try:
                    company, created = InsuranceCompany.objects.get_or_create(
                        name=company_name,
                        # No other fields are required by InsuranceCompany model itself
                    )
                    insurance_companies.append(company)
                    unique_name_found = True
                except Exception as e: # Catch IntegrityError for duplicate name
                    if "duplicate key value violates unique constraint" in str(e):
                        # Append a random number to try to make it unique again
                        company_name_base = fake.unique.company()
                        if len(company_name_base) > MAX_INSURANCE_COMPANY_NAME_LENGTH - 6: # 6 for " InsX"
                            company_name = company_name_base[:MAX_INSURANCE_COMPANY_NAME_LENGTH - 6] + " Ins" + str(random.randint(0,9))
                        else:
                            company_name = company_name_base + " Ins" + str(random.randint(0,9))
                        attempts += 1
                    else:
                        self.stdout.write(self.style.WARNING(f"Could not create InsuranceCompany: {e}"))
                        break # Break out of while loop for other errors
            if not unique_name_found:
                self.stdout.write(self.style.WARNING(f"Failed to create unique InsuranceCompany after {attempts} attempts."))


        self.stdout.write(self.style.SUCCESS(f"Created {len(insurance_companies)} InsuranceCompanies."))

        # --- 5. Department ---
        departments = []
        department_names_seed = ['Lab', 'Pharmacy', 'General', 'Main', 'Emergency', 'Surgery', 'Radiology', 'Pathology']
        for name_seed in department_names_seed[:num_departments]:
            dept, created = Department.objects.get_or_create(name=name_seed)
            departments.append(dept)
        if num_departments > len(department_names_seed):
             for _ in range(num_departments - len(department_names_seed)):
                dept, created = Department.objects.get_or_create(name=fake.unique.word() + " Department")
                departments.append(dept)
        self.stdout.write(self.style.SUCCESS(f"Created {len(departments)} Departments."))

        # --- 6. Supplier ---
        suppliers = []
        for _ in range(num_suppliers):
            supplier, created = Supplier.objects.get_or_create(
                official_name=fake.unique.company(),
                defaults={'common_name': fake.word()}
            )
            suppliers.append(supplier)
        self.stdout.write(self.style.SUCCESS(f"Created {len(suppliers)} Suppliers."))

        # --- 7. Item ---
        items = []
        item_category_choices = [choice[0] for choice in Item.CATEGORY_CHOICES]
        unit_choices = [choice[0] for choice in Item.UNIT_CHOICES]
        for _ in range(num_items):
            item, created = Item.objects.get_or_create(
                item_code=fake.unique.bothify(text='#####-??'),
                defaults={
                    'name': fake.unique.word() + ' ' + fake.word(),
                    'desc': fake.sentence(),
                    'category': random.choice(item_category_choices),
                    'units_of_measure': random.choice(unit_choices),
                    'vat_rate': fake.pydecimal(left_digits=2, right_digits=2, min_value=0, max_value=20),
                    'packed': str(random.randint(1, 10)),
                    'subpacked': str(random.randint(1, 50)),
                    'slow_moving_period': random.choice([30, 60, 90, 120, 180])
                }
            )
            items.append(item)
        self.stdout.write(self.style.SUCCESS(f"Created {len(items)} Items."))

        # --- 8. Requisition ---
        requisitions = []
        if not users or not departments:
            self.stdout.write(self.style.WARNING("Skipping Requisition creation due to missing users or departments."))
        else:
            for _ in range(num_requisitions):
                requested_by_user = random.choice(users)
                department_obj = random.choice(departments)
                
                requisition = Requisition.objects.create(
                    department=department_obj,
                    requested_by=requested_by_user,
                    department_approved=fake.boolean(chance_of_getting_true=70),
                    procurement_approved=fake.boolean(chance_of_getting_true=50),
                    approved_by=random.choice(users) if fake.boolean(chance_of_getting_true=80) else None,
                    department_approval_date=fake.date_time_this_year() if fake.boolean() else None,
                    procurement_approval_date=fake.date_time_this_year() if fake.boolean() else None,
                )
                requisitions.append(requisition)
        self.stdout.write(self.style.SUCCESS(f"Created {len(requisitions)} Requisitions."))

        # --- 9. RequisitionItem ---
        requisition_items = []
        if not requisitions or not items:
            self.stdout.write(self.style.WARNING("Skipping RequisitionItem creation due to missing requisitions or items."))
        else:
            for req in requisitions:
                for _ in range(random.randint(1, 5)): # 1 to 5 items per requisition
                    item_obj = random.choice(items)
                    quantity_req = random.randint(1, 100)
                    req_item = RequisitionItem.objects.create(
                        requisition=req,
                        item=item_obj,
                        quantity_requested=quantity_req,
                        quantity_approved=random.randint(0, quantity_req),
                        ordered=fake.boolean(chance_of_getting_true=60),
                        preferred_supplier=random.choice(suppliers) if suppliers and fake.boolean() else None,
                        unit_cost=fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=10, max_value=1000)
                    )
                    requisition_items.append(req_item)
        self.stdout.write(self.style.SUCCESS(f"Created {len(requisition_items)} RequisitionItems."))

        # --- 10. PurchaseOrder ---
        purchase_orders = []
        po_status_choices = [choice[0] for choice in PurchaseOrder.Status.choices]
        if not users:
            self.stdout.write(self.style.WARNING("Skipping PurchaseOrder creation due to missing users."))
        else:
            for _ in range(num_po):
                ordered_by_user = random.choice(users)
                po = PurchaseOrder.objects.create(
                    ordered_by=ordered_by_user,
                    approved_by=random.choice(users) if fake.boolean(chance_of_getting_true=80) else None,
                    status=random.choice(po_status_choices),
                    requisition=random.choice(requisitions) if requisitions and fake.boolean() else None,
                    created_by=random.choice(users),
                    supplier=random.choice(suppliers) if suppliers and fake.boolean() else None,
                    is_dispatched=fake.boolean(chance_of_getting_true=40)
                )
                purchase_orders.append(po)
        self.stdout.write(self.style.SUCCESS(f"Created {len(purchase_orders)} PurchaseOrders."))

        # --- 11. PurchaseOrderItem ---
        purchase_order_items = []
        if not purchase_orders or not items:
            self.stdout.write(self.style.WARNING("Skipping PurchaseOrderItem creation due to missing purchase orders or items."))
        else:
            for po in purchase_orders:
                related_requisition_items = RequisitionItem.objects.filter(requisition=po.requisition) if po.requisition else []
                if not related_requisition_items:
                    for _ in range(random.randint(1, 3)):
                        item_obj = random.choice(items)
                        quantity_ord = random.randint(1, 50)
                        po_item = PurchaseOrderItem.objects.create(
                            purchase_order=po,
                            requisition_item=None,
                            quantity_ordered=quantity_ord,
                            quantity_received=random.randint(0, quantity_ord) # Ensure <= quantity_ordered
                        )
                        purchase_order_items.append(po_item)
                else:
                    for req_item in random.sample(list(related_requisition_items), min(len(related_requisition_items), random.randint(1, 3))):
                        quantity_ord = req_item.quantity_approved if req_item.quantity_approved > 0 else random.randint(1, 50)
                        po_item = PurchaseOrderItem.objects.create(
                            purchase_order=po,
                            requisition_item=req_item,
                            quantity_ordered=quantity_ord,
                            quantity_received=random.randint(0, quantity_ord) # Ensure <= quantity_ordered
                        )
                        purchase_order_items.append(po_item)
        self.stdout.write(self.style.SUCCESS(f"Created {len(purchase_order_items)} PurchaseOrderItems."))

        # --- 12. SupplierInvoice ---
        supplier_invoices = []
        invoice_statuses = [choice[0] for choice in SupplierInvoice.STATUS]
        if not purchase_orders or not suppliers:
            self.stdout.write(self.style.WARNING("Skipping SupplierInvoice creation due to missing purchase orders or suppliers."))
        else:
            for _ in range(num_invoices):
                po_obj = random.choice(purchase_orders)
                # Ensure supplier is valid for the PO, or pick a random one if PO has no supplier
                supplier_for_invoice = po_obj.supplier if po_obj.supplier else random.choice(suppliers)
                if not supplier_for_invoice: # Fallback if no suppliers at all
                    self.stdout.write(self.style.WARNING("No suppliers available for SupplierInvoice. Skipping."))
                    break

                try:
                    invoice = SupplierInvoice.objects.create(
                        invoice_no=fake.unique.bothify(text='INV-########'),
                        amount=fake.pydecimal(left_digits=5, right_digits=2, positive=True, min_value=100, max_value=5000),
                        status=random.choice(invoice_statuses),
                        supplier=supplier_for_invoice,
                        purchase_order=po_obj
                    )
                    supplier_invoices.append(invoice)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Could not create SupplierInvoice: {e}"))
        self.stdout.write(self.style.SUCCESS(f"Created {len(supplier_invoices)} SupplierInvoices."))

        # --- 13. GoodsReceiptNote ---
        goods_receipt_notes = []
        if not purchase_orders:
            self.stdout.write(self.style.WARNING("Skipping GoodsReceiptNote creation due to missing purchase orders."))
        else:
            for _ in range(num_grn):
                grn = GoodsReceiptNote.objects.create(
                    note=fake.paragraph(nb_sentences=2),
                    purchase_order=random.choice(purchase_orders) if fake.boolean() else None,
                )
                goods_receipt_notes.append(grn)
        self.stdout.write(self.style.SUCCESS(f"Created {len(goods_receipt_notes)} GoodsReceiptNotes."))

        # --- 14. IncomingItem ---
        incoming_items = []
        category_1_choices = [choice[0] for choice in IncomingItem.CATEGORY_1_CHOICES]
        if not items or not suppliers:
            self.stdout.write(self.style.WARNING("Skipping IncomingItem creation due to missing items or suppliers."))
        else:
            for _ in range(num_incoming_items):
                item_obj = random.choice(items)
                supplier_obj = random.choice(suppliers)
                po_obj = random.choice(purchase_orders) if purchase_orders and fake.boolean(chance_of_getting_true=70) else None
                
                if po_obj and po_obj.supplier:
                    supplier_obj = po_obj.supplier

                supplier_invoice_obj = random.choice(supplier_invoices) if supplier_invoices and fake.boolean(chance_of_getting_true=50) else None
                grn_obj = random.choice(goods_receipt_notes) if goods_receipt_notes and fake.boolean(chance_of_getting_true=50) else None

                purchase_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=5, max_value=500)
                sale_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=purchase_p + 1, max_value=1000)

                incoming_item = IncomingItem.objects.create(
                    purchase_price=purchase_p,
                    sale_price=sale_p,
                    quantity=random.randint(1, 200),
                    category_one=random.choice(category_1_choices),
                    item=item_obj,
                    supplier=supplier_obj,
                    purchase_order=po_obj,
                    lot_no=fake.bothify(text='LOT-#####'),
                    expiry_date=fake.date_between(start_date='+30d', end_date='+2y'),
                    supplier_invoice=supplier_invoice_obj,
                    goods_receipt_note=grn_obj
                )
                incoming_items.append(incoming_item)
        self.stdout.write(self.style.SUCCESS(f"Created {len(incoming_items)} IncomingItems."))

        # --- 15. Inventory ---
        inventory_items = []
        category_one_choices = [choice[0] for choice in Inventory.CATEGORY_ONE_CHOICES]
        if not items or not departments:
            self.stdout.write(self.style.WARNING("Skipping Inventory creation due to missing items or departments."))
        else:
            for _ in range(num_inventory):
                item_obj = random.choice(items)
                department_obj = random.choice(departments)
                
                purchase_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=10, max_value=500)
                sale_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=purchase_p + 1, max_value=1000)

                # Fix for naive datetime warning: make datetime objects timezone aware
                last_deducted_at_naive = fake.date_time_this_year()
                last_deducted_at_aware = timezone.make_aware(last_deducted_at_naive) if last_deducted_at_naive else None

                inventory_item = Inventory.objects.create(
                    purchase_price=purchase_p,
                    sale_price=sale_p,
                    quantity_at_hand=random.randint(1, 500),
                    last_deducted_at=last_deducted_at_aware if fake.boolean() else None, # Use aware datetime
                    re_order_level=random.randint(5, 50),
                    category_one=random.choice(category_one_choices),
                    lot_number=fake.bothify(text='LOT-#####'),
                    expiry_date=fake.date_between(start_date='+30d', end_date='+3y'),
                    department=department_obj,
                    item=item_obj
                )
                inventory_items.append(inventory_item)
        self.stdout.write(self.style.SUCCESS(f"Created {len(inventory_items)} Inventory items."))

        # --- 16. InventoryArchive ---
        inventory_archives = []
        if not items:
            self.stdout.write(self.style.WARNING("Skipping InventoryArchive creation due to missing items."))
        else:
            for _ in range(int(num_inventory * 0.2)): # Archive about 20% of inventory items
                item_obj = random.choice(items)
                
                purchase_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=10, max_value=500)
                sale_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=purchase_p + 1, max_value=1000)

                archive_item = InventoryArchive.objects.create(
                    item=item_obj,
                    purchase_price=purchase_p,
                    sale_price=sale_p,
                    quantity_at_hand=0, 
                    re_order_level=random.randint(5, 50),
                    category_one=random.choice(category_one_choices),
                    lot_number=fake.bothify(text='ARC-#####'),
                    expiry_date=fake.date_between(start_date='-1y', end_date='-1d') 
                )
                inventory_archives.append(archive_item)
        self.stdout.write(self.style.SUCCESS(f"Created {len(inventory_archives)} InventoryArchive items."))

        # --- 17. InsuranceItemSalePrice ---
        insurance_item_sale_prices = []
        if not items or not insurance_companies:
            self.stdout.write(self.style.WARNING("Skipping InsuranceItemSalePrice creation due to missing items or insurance companies."))
        else:
            for _ in range(num_items * 2): # More sales prices than items
                item_obj = random.choice(items)
                company_obj = random.choice(insurance_companies)
                
                # Check for existing combination before creating to avoid UniqueConstraint error if any
                if not InsuranceItemSalePrice.objects.filter(item=item_obj, insurance_company=company_obj).exists():
                    item_selling_price = item_obj.selling_price if item_obj.active_inventory_items.exists() else fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=50, max_value=1000)
                    
                    sale_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=float(item_selling_price) * 0.8, max_value=float(item_selling_price) * 1.2)
                    co_pay = fake.pydecimal(left_digits=2, right_digits=2, min_value=0, max_value=50)

                    insurance_item_sale_price = InsuranceItemSalePrice.objects.create(
                        item=item_obj,
                        insurance_company=company_obj,
                        sale_price=sale_p,
                        co_pay=co_pay
                    )
                    insurance_item_sale_prices.append(insurance_item_sale_price)
        self.stdout.write(self.style.SUCCESS(f"Created {len(insurance_item_sale_prices)} InsuranceItemSalePrices."))

        # --- 18. DepartmentInventory ---
        department_inventories = []
        if not departments or not items:
            self.stdout.write(self.style.WARNING("Skipping DepartmentInventory creation due to missing departments or items."))
        else:
            for _ in range(num_departments * 5): 
                dept_obj = random.choice(departments)
                item_obj = random.choice(items)
                main_inv_obj = random.choice(inventory_items) if inventory_items and fake.boolean(chance_of_getting_true=70) else None

                purchase_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=10, max_value=500)
                sale_p = fake.pydecimal(left_digits=3, right_digits=2, positive=True, min_value=purchase_p + 1, max_value=1000)

                dept_inventory = DepartmentInventory.objects.create(
                    department=dept_obj,
                    item=item_obj,
                    quantity_at_hand=random.randint(1, 100),
                    lot_number=fake.bothify(text='DEPTLOT-#####'),
                    expiry_date=fake.date_between(start_date='+30d', end_date='+2y'),
                    purchase_price=purchase_p,
                    sale_price=sale_p,
                    main_inventory=main_inv_obj
                )
                department_inventories.append(dept_inventory)
        self.stdout.write(self.style.SUCCESS(f"Created {len(department_inventories)} DepartmentInventories."))

        # --- 19. QuotationCustomer ---
        quotation_customers = []
        if not users:
            self.stdout.write(self.style.WARNING("Skipping QuotationCustomer creation due to missing users."))
        else:
            for _ in range(num_quotations // 2): 
                customer = QuotationCustomer.objects.create(
                    customer=random.choice(users) if fake.boolean(chance_of_getting_true=70) else None, 
                    name=fake.name(),
                    email=fake.unique.email(), # Use unique email here to avoid future conflicts if email becomes unique
                    phone=fake.phone_number(),
                    address=fake.address(),
                    contact_person=fake.name()
                )
                quotation_customers.append(customer)
        self.stdout.write(self.style.SUCCESS(f"Created {len(quotation_customers)} QuotationCustomers."))

        # --- 20. Quotation ---
        quotations = []
        quotation_statuses = [choice[0] for choice in Quotation.STATUS_CHOICES]
        if not users:
            self.stdout.write(self.style.WARNING("Skipping Quotation creation due to missing users."))
        else:
            for _ in range(num_quotations):
                created_by_user = random.choice(users)
                approved_by_user = random.choice(users) if fake.boolean(chance_of_getting_true=70) else None
                
                customer_user = None
                customer2_obj = None

                if users and quotation_customers:
                    customer_type_choice = random.choice(['custom_user', 'quotation_customer'])
                    if customer_type_choice == 'custom_user':
                        customer_user = random.choice(users)
                    else:
                        customer2_obj = random.choice(quotation_customers)
                elif users:
                    customer_user = random.choice(users)
                elif quotation_customers:
                    customer2_obj = random.choice(quotation_customers)
                else:
                    self.stdout.write(self.style.WARNING("Cannot create Quotation: No users or quotation customers available."))
                    continue

                # The .save() method in Quotation model will now generate the unique quotation_number
                quotation = Quotation.objects.create(
                    status=random.choice(quotation_statuses),
                    created_by=created_by_user,
                    approved_by=approved_by_user,
                    customer=customer_user,
                    customer2=customer2_obj
                )
                quotations.append(quotation)
        self.stdout.write(self.style.SUCCESS(f"Created {len(quotations)} Quotations."))

        # --- 21. QuotationItem ---
        quotation_items = []
        if not quotations or not items:
            self.stdout.write(self.style.WARNING("Skipping QuotationItem creation due to missing quotations or items."))
        else:
            for q in quotations:
                for _ in range(random.randint(1, 5)): # 1 to 5 items per quotation
                    item_obj = random.choice(items)
                    
                    quotation_price = item_obj.selling_price if item_obj.active_inventory_items.exists() else fake.pydecimal(left_digits=4, right_digits=2, positive=True, min_value=100, max_value=5000)
                    
                    quotation_item = QuotationItem.objects.create(
                        quantity=random.randint(1, 50),
                        item=item_obj,
                        quotation=q,
                        quotation_price=quotation_price
                    )
                    quotation_items.append(quotation_item)
        self.stdout.write(self.style.SUCCESS(f"Created {len(quotation_items)} QuotationItems."))

        self.stdout.write(self.style.SUCCESS("\nDummy data generation complete!"))

    def _clear_all_data(self):
        """Deletes all data from the models, ordered to respect foreign key constraints."""
        self.stdout.write(self.style.WARNING("Deleting existing dummy data... This might take a while."))
        # Most dependent models first
        QuotationItem.objects.all().delete()
        Quotation.objects.all().delete()
        QuotationCustomer.objects.all().delete()
        DepartmentInventory.objects.all().delete()
        InsuranceItemSalePrice.objects.all().delete()
        InventoryArchive.objects.all().delete()
        Inventory.objects.all().delete()
        IncomingItem.objects.all().delete()
        GoodsReceiptNote.objects.all().delete()
        SupplierInvoice.objects.all().delete()
        PurchaseOrderItem.objects.all().delete()
        PurchaseOrder.objects.all().delete()
        RequisitionItem.objects.all().delete()
        Requisition.objects.all().delete()
        Item.objects.all().delete()
        Supplier.objects.all().delete()
        Department.objects.all().delete()
        
        # Company/Insurance related models
        InsuranceCompany.objects.all().delete()
        CompanyBranch.objects.all().delete()
        Company.objects.all().delete()
        
        # User and related profiles (delete profiles before user)
        DoctorProfile.objects.all().delete()
        NurseProfile.objects.all().delete()
        SysadminProfile.objects.all().delete()
        LabTechProfile.objects.all().delete()
        ReceptionistProfile.objects.all().delete()
        CustomUser.objects.all().delete() # Delete custom users last
        
        # Groups (Permissions are usually not deleted, but groups might be if auto-created)
        Group.objects.filter(name__startswith='DummyGroup').delete() # Only delete dummy groups

        self.stdout.write(self.style.SUCCESS("All specified data cleared successfully."))