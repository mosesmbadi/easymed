from celery import shared_task

from .models import EtimsSubmission


@shared_task
def submit_to_etims(submission_id):
    from .etims import retry_later, submit

    submission = EtimsSubmission.objects.select_related('invoice__patient').filter(pk=submission_id).first()
    if submission is None:
        return
    if not submit(submission):
        retry_later(submission)


@shared_task
def resend_unsent_etims():
    """Hourly: retry submissions that failed or were never sent."""
    from integrations import etims

    from .etims import submit

    if not etims.is_configured():
        return
    for submission in EtimsSubmission.objects.exclude(status=EtimsSubmission.Status.SENT)[:200]:
        submit(submission)
