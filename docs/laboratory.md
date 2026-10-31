# laboratory — tests, samples, results and the lab bench

`backend/laboratory/` · mounted at `/lab/`

Covers the test catalogue, ordering tests, collecting samples, entering and
approving results, reagent and consumable consumption, the sample archive,
analyser integration and walk-in lab visits. It is the core of the standalone-lab
deployment.

Stock setup for the lab is explained in depth in
[backend/docs/LAB_REAGENTS_SETUP.md](../backend/docs/LAB_REAGENTS_SETUP.md).

## Concepts

```
LabTestProfile  (e.g. "Renal Function")
   └─ LabTestPanel  (e.g. "Urea") ── item (billing handle, holds the price)
         ├─ specimen  (e.g. "Blood")  ── SpecimenConsumable (syringe, tube, gloves)
         ├─ TestPanelReagent  (reagent item × units per run)
         └─ ReferenceValue  (by sex / age range, normal + critical)
```

- The **panel** is what the lab sells. Its price is stored on its one-to-one
  `item` (category `Lab Test`).
- **Reagents** are spent when the test is run (result entered).
- **Collection consumables** are spent when the sample is drawn, once per sample —
  a retest reuses the sample and does not draw again.

## Models

### Catalogue

| Model | Key fields |
| --- | --- |
| `LabTestProfile` | `name`; `billing_items()` |
| `Specimen` | `name`, `max_archive_duration` (days) |
| `SpecimenConsumable` | `specimen`, `item` (consumable), quantity |
| `LabTestPanel` | `name`, `test_profile`, `specimen`, `units`, `item` (1:1), `is_qualitative`, `is_quantitative`, `tat` (turnaround). Methods: `sale_price`, `set_sale_price()`, `can_run(runs)`, `available_runs`, `collection_requirements` |
| `TestPanelReagent` | `test_panel`, `reagent_item` (category `LabReagent`), `units_consumed_per_run` |
| `ReferenceValue` | `lab_test_panel`, `sex`, `age_min/max`, `ref_value_low/high`, `critical_low/high` |
| `LabTestInterpretation` | Per profile: interpretation text, `clinical_action`, `requires_immediate_attention` |
| `LabReagent` | Extra metadata for a reagent item (CAS number, molecular weight, purity) |
| `LabEquipment` | Analyser: `name`, `ip_address`, `port`, `data_format` (hl7/astm), `com_mode` (tcp/...) |
| `LabSettings` | Singleton: `default_tat_minutes` (default 60). `LabSettings.get_settings()` |

### Orders and results

| Model | Key fields |
| --- | --- |
| `ProcessTestRequest` | Per-visit container; `reference` = visit `track_number`. Created with the `AttendanceProcess` |
| `LabTestRequest` | `process`, `test_profile`, `requested_by`, `referring_doctor`, `referring_facility`, `consignment`, `external_reference` (the sender's own number), `note`, `has_result` |
| `SampleConsignment` | A delivery of samples from another facility: `reference` (`RS-YYMMDD-NNN`), `facility` (a `facility` credit account), `received_at`, `received_by`, `courier`, `request_form` (scan), `note` |
| `LabTestRequestPanel` | One test on a request: `test_panel`, `lab_test_request`, `patient_sample`, `result`, `test_code` (`TC-NNNN`), `category` (qualitative/quantitative), `result_approved`, `approved_on`, `approved_by` (signs the report), `is_billed`, `auto_interpretation`, `clinical_action`, `requires_attention` |
| `PatientSample` | `specimen`, `process`, `lab_test_request`, `patient_sample_code` (unique, yearly sequence), `is_sample_collected`, `collected_on`; for a sample sent in, `collected_externally` (no draw kit of ours deducted), `collected_by`, `received_on`, `condition`, `rejected`, `rejection_reason` |
| `PatientSampleConsumable` | What a collected sample actually consumed (and whether it was short) |
| `ReagentConsumptionLog` | Reagent used per panel run |
| `PublicLabTestRequest` | Lab test booked from the public site |

**`LabTestRequestPanel.save()`** finds or creates the `PatientSample` for
`(process, specimen)` — so all tests on one specimen in a visit share one tube —
sets `category` from the panel, and fills the interpretation fields when a result
is present.

### Sample archive

`Archive → ArchiveComponent → ArchiveSection → ArchiveRack → ArchivePosition`
models a physical store. `PatientSampleArchive` puts a sample in a position and
records an `action` (`dispose`, `retest`, `released`). A `post_save` signal logs
the action to `DisposedSample` / `RetestSample` / `ReleasedSample` and frees
the position.

## Lifecycle of a test

1. **Order** — doctor (or walk-in) creates `LabTestRequest` + `LabTestRequestPanel`s
   and an `InvoiceItem` per panel. Visit `track` → `lab`.
2. **Bill** — billing the line checks `LabTestPanel.can_run()`; if reagents are
   short in Lab stock the line is refused. See [billing.md](billing.md#billing-and-stock).
3. **Collect** — set `PatientSample.is_sample_collected`. The `post_save` signal
   runs `deduct_specimen_consumables` **inline**, so the response tells the
   phlebotomist if the shelf was short.
4. **Result** — saving a panel with a `result` queues `deduct_test_kit`
   (Celery, idempotent per panel+reagent) to consume reagents.
5. **Approve** — set `result_approved`; the visit's
   `has_approved_lab_results` turns true.
6. **Report** — `download_labtestresult_pdf/<process_id>/` renders
   `templates/labtestresult.html`.

Lab stock lives in the department resolved by `utils.lab_department()`.

## Walk-in visits (`walk_in.py`)

`create_lab_visit()` builds, in one transaction, exactly what a doctor's order
builds:
- an `AttendanceProcess` on track `lab`;
- one `LabTestRequest` per profile;
- one `LabTestRequestPanel` per test;
- one invoice line per test.

**Billing.** Lines billed to a corporate or referring-facility account are
created `billed`, so they skip the till; anything else waits for the cashier.
Billing checks the reagents are there. If one isn't, the `ValidationError` it
raises rolls the whole visit back, and the endpoints answer 400.

`create_walk_in_visit()` wraps it for the counter: it uses an existing patient
or registers one. A new patient gives a `date_of_birth` or an `age_years`; an
age is turned into an estimated date, and `Patient.date_of_birth_estimated` is
set.

## Referred-in samples (`referrals.py`)

A clinic sends samples with a request form. `receive_consignment()` books in a
`SampleConsignment`. For each patient on the form it:
- finds the patient by the clinic's own number for them
  (`Patient.referred_from` + `external_id`), or registers them;
- builds a lab visit billed to the clinic's account;
- marks the samples collected externally, with their condition.

**What the form must carry.** A name, or the clinic's own number for the
patient. Sex, age and date of birth are optional on referred samples (the
report prints "Not given"); walk-ins still need them.

**Coded samples.** Some samples come by number only: HIV viral loads by CCC
number, trial samples by study ID, sensitive tests a clinic codes on purpose.
Booked in with blank names and an `external_reference`, the patient is
`Patient.is_coded`, and `Patient.display_name` reads
"<clinic> <their number>" everywhere a name would go: the bench, the
report, invoices and statements. Coded patients don't come up in the walk-in
search. An entry with neither a name nor a reference is refused.

**Nobody messages a referred patient.** Results and rejections for a
consignment go to the sending facility only; the patient SMS/WhatsApp is
for walk-ins.

**A rejected sample** (one with a `rejection_reason`) is recorded but not
billed, and the clinic is emailed and texted (`notifications.lab`). The whole
consignment is all or nothing.

`POST referred-samples/` takes JSON, or multipart with the scanned
`request_form` and `entries` as a JSON string. `GET referred-samples/` lists
consignments; `?facility=` narrows them.

## Results delivery

When the last billed, unrejected result on a visit is approved,
`notifications.lab.notify_results_ready` sends messages (see the
`notifications` app):
- **A walk-in nobody here is treating** gets an SMS (and WhatsApp, when set up)
  that their results are ready. The message never contains the results.
- **The referring facility** (the consignment's, or a facility account matching
  `referring_facility`) is emailed the report PDF.
- **A patient of our own doctors** is not messaged.

Every message is recorded as an `OutboundMessage`, sent or not. A channel
that's not set up is marked `skipped`.

The report's APPROVED BY block shows the approver's name and
`registration_number` (e.g. KMLTTB), and the requester's reference.

Access: `HasAnyNamedPermission('CAN_ACCESS_LABORATORY_DASHBOARD',
'CAN_ACCESS_RECEPTION_DASHBOARD')`.

## Endpoints (`/lab/...`)

Router resources:

| Path | Purpose |
| --- | --- |
| `lab-test-profile/`, `lab-test-panel/` | Catalogue |
| `specimens/`, `specimen-consumables/`, `test-panel-reagents/` | Consumption setup |
| `reference-values/`, `lab-test-interpretations/` | Result interpretation |
| `lab-reagents/`, `lab-equipment/`, `lab-settings/` | |
| `lab-test-requests/`, `lab-test-requests-panel/` | Orders and results |
| `process-test-request/`, `patient-samples/` | |
| `public-lab-test-request/` | Public bookings |
| `testkitcounters/` | Reagent availability **derived from the ledger** (historical route name; no counter table) |
| `low-stock-reagents/` | Reagents low/out (`?status=`) |
| `reagent-consumption/` | Consumption log |
| `archive/`, `archive-component/`, `archive-section/`, `archive-rack/`, `archive-position/`, `patient-sample-archive/` | Archive |
| `disposed-samples/`, `retest-samples/`, `released-samples/` | Archive history |

Other paths:

| Path | Purpose |
| --- | --- |
| `POST walk-in-requests/` | Create a walk-in visit |
| `GET/POST referred-samples/` | List or book in samples sent by another facility |
| `GET walk-in-requests/patients/?search=` or `?id=` | Find a returning patient (lab cannot use the reception-only patients API); returns their accounts on file |
| `GET lab-test-request-by-patient-id/<patient_id>/` | |
| `GET lab-test-request-by-process-id/<process_id>/` | |
| `GET lab-test-request-panels-by-lab-test-request-id/<id>/` | |
| `GET labtestpanels-byprofile-id/<profile_id>/` | |
| `GET labtestrequestpanels/sample/<patient_sample_code>/` | Tests on one sample |
| `GET patient-samples-by-process-id/<process_id>/` | |
| `GET lab-dashboard-metrics/` | TAT analysis, volumes, etc. |
| `GET print-lab-report/` | Metrics PDF (`lab_metrics_report.html`) |
| `GET download_labtestresult_pdf/<processtestrequest_id>/` | Result report |

Most viewsets allow doctor, nurse, labtech and receptionist roles.

## Analyser integration

`LabEquipment` describes analysers. The separate `lis_server` container
(`mosesmbadi/hl7-astm-parser`, port 9091) talks HL7/ASTM to the machines and posts
results back to the backend using `BACKEND_USERNAME`/`BACKEND_PASSWORD` and
`RESULTS_ENDPOINT` from `.env`. See [infrastructure.md](infrastructure.md#lis-server).

## Management command

`regenerate_reference_values` — rebuild reference ranges.

## Tests

`laboratory/tests/`: `test_walk_in.py`, `test_referred_samples.py`, `test_lab_billing_and_costs.py`,
`test_specimen_consumables.py`, `test_demo_data.py`.

## Known issues

- `LabTestRequestPanel.test_panel` uses `on_delete=models.SET("Deleted Panel")`,
  which tries to store a string in a foreign key; deleting a panel that has
  requests will fail.
- `generate_test_code()` picks random 4-digit codes; with more than a few
  thousand tests it loops longer and longer, and it cannot exceed 10,000.
- `LabSettings.save()` silently returns the existing row instead of saving when
  a second instance is created.
- `requested_on` is a `TimeField` and `created_on` a `DateField`, so a request's
  timestamp is split across two fields.
