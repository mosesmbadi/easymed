# Fixing the "MultipleObjectsReturned" Error with PatientSample

## Problem Identified

When updating an invoice item's status to "billed" for a lab test, the system was encountering a `MultipleObjectsReturned` error with the PatientSample model. This occurred because:

1. In the `billing/signals.py`, when an InvoiceItem's status is changed to 'billed', it triggers the `update_service_billed_status` function
2. This function then finds the related `LabTestRequestPanel` and sets its `is_billed` flag to True
3. When the `LabTestRequestPanel` is saved, its save method calls `get_or_create` to find or create a PatientSample
4. However, this could create duplicate PatientSample records if the process was repeated, leading to multiple records for the same process and specimen
5. Later, when code tries to call `PatientSample.objects.get(...)`, the database returns multiple records instead of one, causing the error

## Solution Implemented

1. **Fixed the `LabTestRequestPanel.save()` method**:
   - Modified the code to handle the case where multiple PatientSample records already exist
   - Instead of using `get_or_create()` which can create duplicates, we now:
     - First check if any PatientSample records exist for the process/specimen combination
     - If they do, use the first one instead of creating a new one
     - Only create a new one if none exist

2. **Created a script to fix existing duplicate records**:
   - The script `fix_duplicate_patient_samples.py` finds all cases of duplicate PatientSample records
   - For each set of duplicates, it keeps the oldest record and updates any references to the others
   - It then deletes the duplicate records, cleaning up the database

## How to Apply the Fix

1. The fix has been applied to the `LabTestRequestPanel.save()` method in `laboratory/models.py`

2. To clean up existing duplicate records, run:
   ```
   python manage.py shell < laboratory/fix_duplicate_patient_samples.py
   ```

3. After applying these changes, the system should handle PatientSample records correctly, and the "MultipleObjectsReturned" error should no longer occur when updating invoice items.

## Testing the Fix

After implementing these changes:

1. Try updating invoice item status to 'billed' for lab tests
2. Verify that the LabTestRequestPanel is correctly marked as billed
3. Check that no duplicate PatientSample records are created
4. Confirm that the laboratory dashboard correctly shows only lab tests with status "billed"

This solution prevents new duplicate records while also cleaning up any existing duplicates.