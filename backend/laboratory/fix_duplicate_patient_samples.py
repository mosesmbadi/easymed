#!/usr/bin/env python
"""
Script to find and fix duplicate PatientSample records.

This script will:
1. Find all cases where multiple PatientSample records exist for the same process and specimen
2. Keep the oldest record and update any references to point to it
3. Delete the duplicate records

Run this script with:
python manage.py shell < fix_duplicate_patient_samples.py
"""

from django.db import transaction
from laboratory.models import PatientSample, LabTestRequestPanel
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
                for panel in LabTestRequestPanel.objects.filter(patient_sample=sample):
                    panel.patient_sample = keeper
                    panel.save(update_fields=['patient_sample'])
                
                sample.delete()
                count += 1
    
    print(f"Fixed {count} duplicate PatientSample records.")
    return count

# Run the function
if __name__ == "__main__":
    fix_duplicate_patient_samples()