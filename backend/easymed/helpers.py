
from patient.models import PrescribedDrug, Prescription, AttendanceProcess
from django.contrib.auth import get_user_model
from datetime import timedelta, datetime
import logging

logger = logging.getLogger(__name__)

User = get_user_model()
 
def get_active_prescriptions(end_time: datetime) -> list:
    """Fetch active prescriptions for admitted patients via AttendanceProcess."""
    attendance_processes = AttendanceProcess.objects.filter(
        prescription__isnull=False
    )
    prescriptions = Prescription.objects.filter(
        attendanceprocess__in=attendance_processes,
        start_date__lte=end_time
    )
    return prescriptions

def get_due_doses(drug: PrescribedDrug, start_time: datetime, end_time: datetime) -> list:
    """Calculate doses due between start_time and end_time."""
    try:
        doses_per_day = int(drug.frequency)
        duration_days = int(drug.duration)
        total_doses = doses_per_day * duration_days
        hours_between_doses = 24 / doses_per_day

        prescription_start = drug.prescription.date_created if drug.prescription.date_created else drug.created_at
        prescription_start = prescription_start.replace(microsecond=0)
        start_time = start_time.replace(microsecond=0)
        end_time = end_time.replace(microsecond=0)

    except ValueError:
        logger.error(f"Invalid frequency/duration for drug {drug.item.name}.")
        return []

    due_times = []
    current_time = prescription_start
    logger.warning(f"Start: {start_time}, End: {end_time}, Prescription start: {prescription_start}")
    for _ in range(total_doses):
        if start_time <= current_time <= end_time:
            due_times.append(current_time)
        current_time += timedelta(hours=hours_between_doses)
        if current_time > end_time:
            break
    return due_times
