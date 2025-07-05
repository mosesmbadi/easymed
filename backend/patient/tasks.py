from celery import shared_task
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)

@shared_task
def export_patients_to_csv():
    """
    Celery task to export patient data to CSV using the management command.
    """
    try:
        call_command('export_patients')
        logger.info('Patient data export completed successfully.')
    except Exception as e:
        logger.error(f'Error exporting patient data: {e}')
        raise
