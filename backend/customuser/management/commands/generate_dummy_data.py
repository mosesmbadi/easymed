from django.core.management.base import BaseCommand
from customuser.management.utils.data_generators import (
    create_dummy_users,
    create_dummy_companies,
    create_dummy_insurance_companies,
    create_dummy_company_branches,
    create_dummy_items,
)
from customuser.models import CustomUser
from company.models import Company, CompanyBranch, InsuranceCompany
from inventory.models import Item

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