import logging
from asgiref.sync import async_to_sync
from celery import shared_task
from datetime import timedelta
from collections import defaultdict
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage

from .utils import generate_discharge_summary_pdf
from pharmacy.helpers import ( 
    get_active_prescriptions,
    get_due_doses,
)
from inpatient.models import PatientAdmission

User = get_user_model()

logger = logging.getLogger(__name__)


@shared_task
def generate_and_email_discharge_summary(admission_id, user_email):
    """
    Generate a discharge summary PDF for the given admission_id and email it to the user_email.
    """
    from django.contrib.auth import get_user_model
    from django.http import HttpRequest
    User = get_user_model()
    # Create a dummy request for logo URL generation (if needed)
    request = HttpRequest()
    request.META['HTTP_HOST'] = settings.ALLOWED_HOSTS[0] if settings.ALLOWED_HOSTS else 'localhost'
    request.scheme = 'https'
    pdf_file, error = generate_discharge_summary_pdf(admission_id, request)
    if error:
        return {'status': 'error', 'message': error}
    # Email the PDF
    subject = f"Discharge Summary for Admission {admission_id}"
    message = "Please find attached the discharge summary."
    email = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user_email])
    email.attach(f"discharge_summary_{admission_id}.pdf", pdf_file.getvalue(), 'application/pdf')
    email.send()
    return {'status': 'success', 'message': f'Discharge summary sent to {user_email}'}


@shared_task(bind=True, max_retries=3)
def check_medication_notifications(self):
    """
    Periodically checks for prescriptions with doses due in the next hour and sends notifications.
    """
    try:
        now = timezone.now()
        one_hour_later = now + timedelta(hours=1)
        ward_messages = defaultdict(list)

        prescriptions = get_active_prescriptions(one_hour_later)
        if not prescriptions.exists():
            logger.info("No prescriptions due in the next hour.")
            return

        admissions = {
        a.patient_id: a
        for a in PatientAdmission.objects.filter(discharge__isnull=True)
        }

        for prescription in prescriptions:
            patient = prescription.attendanceprocess.patient
            admission = admissions.get(patient.id)
            if not admission:
                continue

            for drug in prescription.prescribeddrug_set.filter(is_dispensed=False):
                due_times = get_due_doses(drug, now, one_hour_later)
                for dose_time in due_times:
                    unit = drug.item.units_of_measure
                    dosage_display = (
                        f"{drug.dosage} {unit}" if unit != 'unit'
                        else f"{drug.dosage} {'tablets' if drug.item.category == 'Drug' else 'units'}"
                    )
                    entry = (
                        f"Patient {admission.admission_id} in bed {admission.bed.bed_number}, "
                        f"needs {dosage_display} of {drug.item.name} "
                        f"at {dose_time.strftime('%Y-%m-%d %H:%M')}."
                    )
                    ward_messages[admission.ward].append(entry)

        for ward, med_list in ward_messages.items():
            message = (
                "The following medications are due within the next hour:\n\n"
                + "\n".join(med_list)
                + "\n\nPlease collect them from the pharmacy."
            )
            send_ward_websocket_task.delay(ward.id, message)

    except Exception as e:
        logger.error(f"Error in check_medication_notifications: {e}", exc_info=True)
        self.retry(exc=e, countdown=60)



@shared_task(bind=True, max_retries=3)
def send_ward_websocket_task(self, ward_id, message):
    """
    Sends a WebSocket notification to all nurses in a ward's group.
    """
    try:
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"ward_{ward_id}_notifications",
            {
                'type': 'send_notification',
                'message': message
            }
        )
        logger.info(f"Sent WebSocket notification to ward {ward_id}.")
    except Exception as e:
        logger.error(f"Failed to send WebSocket for ward {ward_id}: {e}", exc_info=True)
        self.retry(exc=e, countdown=60)
