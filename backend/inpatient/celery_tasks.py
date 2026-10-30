from celery import shared_task
from .models import Bed

@shared_task
def set_bed_status_occupied(bed_id):
    try:
        bed = Bed.objects.get(pk=bed_id)
        bed.status = "occupied"
        bed.save()
    except Bed.DoesNotExist:
        pass