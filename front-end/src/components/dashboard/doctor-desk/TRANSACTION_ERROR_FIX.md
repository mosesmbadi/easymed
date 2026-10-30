# Transaction Management Error Fix

## Problem

When adding multiple lab test profiles and panels from the reception dashboard, the backend throws a `TransactionManagementError`:

```
django.db.transaction.TransactionManagementError: An error occurred in the current transaction. You can't execute queries until the end of the 'atomic' block.
```

This error occurs because multiple concurrent requests are trying to operate within the same atomic database transaction block.

## Root Cause

The issue was identified in the `DirectToTheLabModal.js` component:

1. When sending lab test requests, the component loops through each test profile section.
2. For each lab test request, it calls `savePanels` function to save all selected panels.
3. The `savePanels` function was using `forEach` to iterate through panels, causing **multiple concurrent requests**:

```javascript
const savePanels = (reqId, panelsToSave) => {
  panelsToSave.forEach((panel) => {
    const testReqPanelPayload = {
      test_panel: panel.id,
      lab_test_request: reqId,
    };
    saveAllPanels(testReqPanelPayload); // Multiple concurrent calls
  });
};
```

These concurrent requests were conflicting in the backend's transaction atomic block, specifically in the `PatientSample` model's save method.

## Solution

The solution was to modify the `savePanels` function in `DirectToTheLabModal.js` to process panels sequentially rather than concurrently:

```javascript
// Add delay helper function
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Modified to be async and sequential to prevent transaction errors
const savePanels = async (reqId, panelsToSave) => {
  for (const panel of panelsToSave) {
    const testReqPanelPayload = {
      test_panel: panel.id,
      lab_test_request: reqId,
    };
    await saveAllPanels(testReqPanelPayload);
    await delay(100); // Add small delay between requests
  }
};
```

This approach:

1. Uses `for...of` loop instead of `forEach` to enable proper async/await sequencing
2. Adds a small delay between requests to give the backend time to complete each transaction
3. Ensures that one panel request completes before the next one starts

Additional improvements were made to the `saveAllPanels` function to better handle responses and errors.

## Related Improvements

We also fixed the PatientSample handling in the backend to better handle duplicate records, which may have contributed to the issue:

```python
# In laboratory/models.py, we updated the LabTestRequestPanel.save() method:
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
                print(f"Warning: Multiple PatientSample objects found")
            self.patient_sample = existing_samples.first()
        else:
            # Create a new one if none exist
            self.patient_sample = PatientSample.objects.create(
                process=self.lab_test_request.process,
                specimen=self.test_panel.specimen,
                lab_test_request=self.lab_test_request
            )
```

This combination of frontend and backend improvements should prevent the transaction errors when adding multiple lab test profiles and panels.

## How to Test the Fix

1. Navigate to the reception dashboard
2. Attempt to add multiple lab test profiles with multiple panels for each
3. Verify that all requests are completed successfully without errors
4. Check that all panels are properly associated with their respective lab test requests
