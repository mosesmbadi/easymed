# roby — AI triage assistant

`backend/roby/` · mounted at `/roby/`

Sends a patient's recent triage and consultation history to Google Gemini and
stores the model's suggested condition. Surfaced in the frontend at
`/dashboard/ai-assistant` (permission `CAN_ACCESS_AI_ASSISTANT_DASHBOARD`).

## Model

`TriageResult`: `patient`, `predicted_condition` (text), `gemini_response`
(JSON), `status` (`pending`, `completed`, `error`), `timestamp`, `created_by`.

## Flow

```
POST /roby/triage/request/<patient_id>/
  → triage_request_signal
    → process_triage_request.delay(patient_id)        (Celery, task.py)
        - loads the last 5 Triage and last 5 Consultation records
        - fewer than 2 of either → TriageResult(status='error', "Insufficient data")
        - builds a prompt, tries Gemini models in order:
            gemini-flash-latest, gemini-pro-latest, gemini-2.5-flash,
            gemini-2.5-pro, gemini-2.0-flash
        - saves TriageResult(status='completed', predicted_condition=...)
GET /roby/triage/results/<patient_id>/   → latest TriageResult, or 404
```

The request returns `202 Accepted` immediately; the client polls the results
endpoint.

## Configuration

`GEMINI_API_KEY` in the environment. Without it the task logs a warning and does
nothing (no `TriageResult` is written, so the results endpoint keeps returning
404).

The `roby` logger is configured at INFO in settings.

## Known issues

- Patient clinical data is sent to an external service. There is no consent
  flag, de-identification or audit record of what was sent.
- `TriageResult.created_by` is never set (the request view doesn't pass the user
  to the task).
- No permission classes beyond the default; any signed-in user can trigger
  requests for any patient.
