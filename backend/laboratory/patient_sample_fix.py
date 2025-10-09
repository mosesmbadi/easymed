"""
This is a patch to fix the MultipleObjectsReturned issue in the PatientSample model.

The problem occurs when marking an invoice item as 'billed', which triggers a signal
that tries to update the LabTestRequestPanel, which then calls save() and tries to
get_or_create a PatientSample again, potentially creating duplicates.
"""

# First, we need to modify the LabTestRequestPanel.save() method to check if the PatientSample
# already exists before calling get_or_create, and handle the case where multiple exist.

def fix_lab_test_request_panel_save():
    """
    Update the LabTestRequestPanel.save() method to handle multiple PatientSample objects
    and avoid creating duplicates.
    
    Replace the part in laboratory/models.py around line 265-272 with this improved version.
    """
    return '''
        # Atomically get or create PatientSample for the request/specimen pair
        if self.lab_test_request and self.test_panel and self.lab_test_request.process:
            with transaction.atomic():
                # Check if there are existing PatientSample objects
                existing_samples = PatientSample.objects.filter(
                    process=self.lab_test_request.process,
                    specimen=self.test_panel.specimen,
                )
                
                if existing_samples.exists():
                    # If there are multiple, use the first one
                    if existing_samples.count() > 1:
                        print(f"Warning: Multiple PatientSample objects found for process={self.lab_test_request.process.id}, specimen={self.test_panel.specimen.id}")
                    self.patient_sample = existing_samples.first()
                else:
                    # Create a new one if none exist
                    self.patient_sample = PatientSample.objects.create(
                        process=self.lab_test_request.process,
                        specimen=self.test_panel.specimen,
                        lab_test_request=self.lab_test_request
                    )
    '''

# Second, check if there are already duplicate PatientSample records that need to be cleaned up

def find_and_fix_duplicate_patient_samples():
    """
    Run a script to identify and fix any existing duplicate PatientSample records.
    
    This will find all cases where there are multiple PatientSample records for the same 
    process and specimen, and keep only the oldest one.
    """
    return '''
from django.db import transaction
from laboratory.models import PatientSample
from collections import defaultdict

def fix_duplicate_patient_samples():
    """Find and fix duplicate PatientSample records."""
    print("Checking for duplicate PatientSample records...")
    
    # Group PatientSample records by process and specimen
    sample_groups = defaultdict(list)
    for sample in PatientSample.objects.all():
        if sample.process and sample.specimen:
            key = (sample.process_id, sample.specimen_id)
            sample_groups[key].append(sample)
    
    # Find groups with more than one sample
    duplicates = {key: samples for key, samples in sample_groups.items() if len(samples) > 1}
    
    if not duplicates:
        print("No duplicate PatientSample records found.")
        return 0
    
    count = 0
    with transaction.atomic():
        for key, samples in duplicates.items():
            # Keep the oldest sample and delete the rest
            samples.sort(key=lambda x: x.id)  # Sort by ID (assuming lower ID = older)
            keeper = samples[0]
            to_delete = samples[1:]
            
            print(f"Keeping PatientSample {keeper.id} for process={key[0]}, specimen={key[1]}")
            
            # Update any LabTestRequestPanel references to point to the keeper
            for sample in to_delete:
                print(f"  Deleting duplicate PatientSample {sample.id}")
                
                # Redirect any foreign key references before deleting
                for panel in sample.labtestpanel_set.all():
                    panel.patient_sample = keeper
                    panel.save(update_fields=['patient_sample'])
                
                sample.delete()
                count += 1
    
    print(f"Fixed {count} duplicate PatientSample records.")
    return count

# Run the function
fix_duplicate_patient_samples()
    '''

# Here's a suggested test to verify the fix

def test_invoice_update():
    """
    Test procedure to verify the fix works correctly:
    
    1. Update an invoice item status to 'billed'
    2. Check that the LabTestRequestPanel is correctly marked as billed
    3. Verify no duplicate PatientSample records were created
    """
    return '''
# 1. Find an invoice item for a lab test
invoice_item = InvoiceItem.objects.filter(
    item__category='Lab Test',
    status='pending'
).first()

if not invoice_item:
    print("No pending lab test invoice items found.")
    exit()

# Get process test request
process_test_request = invoice_item.invoice.attendanceprocess.process_test_req

# Count PatientSample records before the update
initial_count = PatientSample.objects.filter(
    process=process_test_request
).count()

print(f"Initial PatientSample count: {initial_count}")

# 2. Update the invoice item status to 'billed'
invoice_item.status = 'billed'
invoice_item.save()

# 3. Check that the LabTestRequestPanel is marked as billed
lab_test_panel = LabTestRequestPanel.objects.filter(
    test_panel__item=invoice_item.item,
    lab_test_request__process=process_test_request
).first()

if lab_test_panel:
    print(f"LabTestRequestPanel is_billed: {lab_test_panel.is_billed}")
else:
    print("No matching LabTestRequestPanel found.")

# 4. Verify no duplicate PatientSample records were created
final_count = PatientSample.objects.filter(
    process=process_test_request
).count()

print(f"Final PatientSample count: {final_count}")
if final_count > initial_count:
    print(f"Warning: {final_count - initial_count} new PatientSample records were created.")
else:
    print("No new PatientSample records were created. Fix successful!")
'''