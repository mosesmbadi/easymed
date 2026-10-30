from django.core.management.base import BaseCommand
from laboratory.models import ReferenceValue
from customuser.management.utils.data_generators import create_reference_values


class Command(BaseCommand):
    '''
    Command to regenerate reference values for lab test panels.
    Usage: python manage.py regenerate_reference_values
    '''
    help = "Delete and regenerate all reference values for lab test panels"

    def handle(self, *args, **options):
        # Delete existing reference values
        count = ReferenceValue.objects.count()
        ReferenceValue.objects.all().delete()
        self.stdout.write(self.style.WARNING(f"Deleted {count} existing reference values."))
        
        # Create new reference values
        reference_values = create_reference_values()
        self.stdout.write(self.style.SUCCESS(f"Created {len(reference_values)} reference values for lab test panels."))
        
        self.stdout.write(self.style.SUCCESS("\nReference values regenerated successfully!"))
