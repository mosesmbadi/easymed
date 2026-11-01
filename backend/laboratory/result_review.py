"""
Rejecting a result at review.

A reviewer who won't sign a result off sends the test back to the bench.
What happens next depends on what is in doubt:

- the run (QC failed, an instrument flag, a value that makes no sense):
  run it again on the same sample;
- the sample (haemolysed, clotted, too little, mislabelled): draw a new one.
  The test moves to a fresh, uncollected sample, which shows under the visit
  in Lab Requests for collection like any other.

Either way the rejected value is kept on a LabResultRejection and cleared
from the test, so the bench enters a new one and the reviewer sees it again.
"""
from django.db import transaction
from rest_framework.exceptions import ValidationError

from .models import LabResultRejection, LabTestRequestPanel, PatientSample


@transaction.atomic
def reject_result(panel, *, reason, action, note='', user=None):
    panel = (LabTestRequestPanel.objects.select_for_update()
             .select_related('patient_sample').get(pk=panel.pk))
    if not panel.result:
        raise ValidationError("There is no result to reject.")
    if panel.result_approved:
        raise ValidationError("This result is already approved.")

    old_sample = panel.patient_sample
    replacement = None
    if action == LabResultRejection.Action.RECOLLECT:
        if old_sample is None:
            raise ValidationError("This test has no sample to recollect.")
        # Tests rejected off the same sample share one new draw.
        replacement = (PatientSample.objects
                       .filter(process=old_sample.process, specimen=old_sample.specimen,
                               is_sample_collected=False, rejected=False)
                       .exclude(pk=old_sample.pk)
                       .order_by('-id').first())
        if replacement is None:
            replacement = PatientSample.objects.create(
                process=old_sample.process,
                specimen=old_sample.specimen,
                lab_test_request=panel.lab_test_request,
            )

    rejection = LabResultRejection.objects.create(
        panel=panel,
        result=panel.result,
        reason=reason,
        action=action,
        note=note,
        rejected_sample=old_sample,
        replacement_sample=replacement,
        rejected_by=user,
    )

    panel.result = None
    panel.result_approved = False
    panel.approved_on = None
    panel.approved_by = None
    panel.auto_interpretation = None
    panel.clinical_action = None
    panel.requires_attention = False
    if replacement is not None:
        panel.patient_sample = replacement
    panel.save()
    return rejection
