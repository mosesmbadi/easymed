# EasyMed User Guide

This guide is for the people who use EasyMed every day: receptionists, nurses,
doctors, lab technicians, pharmacists, cashiers and accountants, store keepers
and system administrators.

Each chapter follows one job from start to finish. If you only do one job, read
**Getting started** and then skip to your chapter.

> Administrators can open this guide inside EasyMed under **Settings → User
> Guide**. Developers should read the `docs/` folder in the code instead.

---

## Contents

1. [Getting started](#1-getting-started)
2. [How a patient visit moves through EasyMed](#2-how-a-patient-visit-moves-through-easymed)
3. [Reception: registering and checking in patients](#3-reception-registering-and-checking-in-patients)
4. [Nursing station: triage](#4-nursing-station-triage)
5. [Doctor desk: consultation, tests, prescriptions, referral, admission](#5-doctor-desk)
6. [Laboratory](#6-laboratory)
7. [Billing: charging the patient](#7-billing-charging-the-patient)
8. [Receiving payments](#8-receiving-payments)
9. [Pharmacy: dispensing](#9-pharmacy-dispensing)
10. [In-patient: wards, beds, admissions and discharge](#10-in-patient)
11. [Inventory and stores](#11-inventory-and-stores)
12. [Procurement and paying suppliers (Accounts Payable)](#12-procurement-and-paying-suppliers)
13. [Cash and cash equivalents](#13-cash-and-cash-equivalents)
14. [Reports](#14-reports)
15. [Announcements](#15-announcements)
16. [AI assistant](#16-ai-assistant)
17. [Administration: users, groups, permissions and company setup](#17-administration)
18. [Standalone lab mode](#18-standalone-lab-mode)
19. [The patient portal](#19-the-patient-portal)
20. [Troubleshooting and FAQ](#20-troubleshooting-and-faq)
21. [Glossary](#21-glossary)

---

## 1. Getting started

### Signing in

1. Open EasyMed in your browser. Your administrator will give you the address.
2. Go to **Login**, then enter your **Email** and **Password**.
3. You land on the dashboard. The left sidebar shows only the areas you are
   allowed to use.

If you forget your password, select **Forgot password** on the login page and
enter your email. You will receive a reset link that expires after **10 minutes**.
If it expires, request a new one. An administrator can also reset your password
for you (see [Administration](#17-administration)).

### Staying signed in

EasyMed logs you out after **30 minutes** without using it, on every computer. You'll
see *"You were logged out after 30 minutes of inactivity."* and go back to the login
page. Moving the mouse, typing, tapping or scrolling all count as using it, in any
EasyMed tab; a page left open on screen does not. Logging out in one tab logs out
the others.

While you work, EasyMed renews your session in the background. If it can't, you'll
see *"Your session has expired. Please login again."* and go back to the login page.
Anything you hadn't saved is lost, so save forms before leaving the computer.

To sign out, use the menu at the top of the screen. Always sign out on a shared
computer.

### What you can see

What appears in your sidebar depends on three things:

- **Your group**, set by your administrator, which decides which screens you can
  open (for example *Laboratory* or *Inventory*).
- **Your role** (Doctor, Nurse, Senior Nurse, Lab Technician, Pharmacist,
  Receptionist, Sysadmin), also set by your administrator, which decides what
  you're allowed to save on those screens.
- **Your facility type**. A standalone lab, for example, has no check-in, triage,
  doctor desk or in-patient menus (see [Standalone lab mode](#18-standalone-lab-mode)).

If you open a page you can't use, you'll see a **Not Authorized** message. If a
screen opens but saving fails with a permissions error, your role doesn't match
the task. Ask your administrator.

### The sidebar

| Menu | Who typically uses it |
| --- | --- |
| Patients | Reception, doctors |
| Check-In | Reception |
| Nursing Station | Nurses |
| Doctor Desk | Doctors |
| Laboratory | Lab technicians |
| Phamarcy (Pharmacy) | Pharmacists |
| Radiology | *(Coming soon)* |
| In-patient | Doctors, senior nurses |
| Finance → Accounts Receivable / Accounts Payable / Cash and Cash equivalents | Cashiers, accountants |
| Inventory | Store keepers, department heads |
| Announcements | All clinical staff |
| Profile, Security | Everyone (your own account) |

### Working with tables

Most lists are tables with the same controls:

- **Search box** above the table. On visit lists you can also choose *which*
  field to search: patient name, patient ID, track number, doctor, diagnosis,
  test name or drug name.
- **Column headers**: select one to sort.
- **Row action menu** (the button at the end of a row): the things you can do with
  that record, such as *Add Triage*, *Prescribe* or *Send To Lab*.
- **Pagination** at the bottom.

Green pop-ups in the corner confirm a save. Red pop-ups explain what went wrong.
Read them, because they usually tell you exactly what to fix (for example, which
item is out of stock).

---

## 2. How a patient visit moves through EasyMed

Every time a patient comes in, EasyMed opens a **visit**. Each visit has a
**track number** (for example `20261030-4821`) and its own **invoice**. Any test,
drug or service ordered during the visit is added to that invoice automatically.

A visit sits in one queue at a time:

```
Check-In ──► Nursing Station ──► Doctor Desk ──┬──► Laboratory ──► (back to Doctor)
(reception)     (triage)          (doctor)     ├──► Pharmacy
                                               ├──► In-patient (admission)
                                               └──► Referral
                         Billing and payment happen alongside, at any point.
```

| Queue | Who works it | How a visit leaves it |
| --- | --- | --- |
| Reception | Receptionist | *Send to Doctor* (assigns a doctor and sends the patient to triage), *Send To Lab*, *Prescribe*, *Admit Patient* |
| Triage | Nurse | *Add Triage* (vitals), then the visit goes to the doctor |
| Doctor | Doctor | *Send To Lab*, *Prescribe*, *Refer Patient*, *Admit* |
| Lab | Lab technician | Results are entered and approved. The doctor sees them under *View results* |
| Pharmacy | Pharmacist | Drugs are dispensed once paid for |

Patients can also skip reception and start at the lab: as a lab
[walk-in](#62-walk-in-patients), or as a sample another facility
[sends in](#63-receiving-samples-from-other-facilities).

**Pay before you serve.** Lab tests only appear on the lab bench after they are
billed, and drugs can only be dispensed after they are billed. Billing is
explained in [section 7](#7-billing-charging-the-patient). Tests charged to a
corporate client's or referring facility's account are billed the moment they are
ordered, so they go straight to the lab.

---

## 3. Reception: registering and checking in patients

Open **Check-In**. The screen has two parts: the **check-in form** and the
**checked-in patients queue** (*Waiting Patients*).

### Check in a returning patient

1. In **Search Patient**, type a name, phone number or ID.
2. Select the patient.
3. Enter the **Reason for Visit**.
4. Submit. The patient appears in the queue with status **Waiting** and a check-in
   time. A new visit (and its invoice) is created.

### Register and check in a new patient

Fill in the form:

- **First Name**, **Last Name**, **Gender**, **Date of Birth**,
  **Phone Number** and **ID/Passport Number**. These are required.
- **Email** (optional).
- **Insurance Companies**: select every insurer or other credit account that
  covers the patient. This decides which agreed prices are available when billing.
- **Reason for Visit**.

Submit. EasyMed assigns a **Patient ID** made of the hospital's prefix and a
running number (for example `ESMED-1042`). Use this ID on all future visits.

> Search before you register. Registering the same person twice splits their
> history across two records.

### Send the patient on

In the queue, open the row's action menu:

| Action | What it does |
| --- | --- |
| **Send to Doctor** | Choose a doctor. The patient goes to the **Nursing Station** for triage first, then to that doctor. The doctor gets an on-screen notification |
| **Send To Lab** | Order lab tests straight away, for example when the patient brings a referral. The visit goes to the lab queue |
| **Prescribe** | Opens the prescription screen for this patient |
| **Admit Patient** | Admits the patient to a ward and bed (see [In-patient](#10-in-patient)) |

### Managing patient records

**Patients** lists every registered patient. From here you can:

- add a patient (**Patients Details**, **Next Of Kin Details** with
  relationship, phone, email and residence, and **Insurance**);
- **Update Patient**;
- start a **New Visit** for a patient;
- **Request Lab Tests**, which opens the lab's [walk-in form](#62-walk-in-patients)
  with the patient already chosen;
- see a patient's insurers;
- open **Referrals** to follow referrals that were made, viewed and completed.

### Public bookings

Appointments that patients book on the public website appear on the
**Booked appointments** page (`/dashboard/reception-interface/booked-appointments`).
It isn't in the sidebar, so bookmark it. Confirm each booking, then check the
patient in as usual.

---

## 4. Nursing station: triage

Open **Nursing Station**. The list shows every visit waiting for triage, with
the patient, their ID (**PId**) and the **Assigned Doctor**.

### Record vitals

1. Open the row's action menu and select **Add Triage**.
2. Enter what you measured:
   - **Temperature** (°C)
   - **Height (cm)** and **Weight (kg)**. **BMI** is calculated for you
   - **Pulse**
   - **Systolic** / **Diastolic** blood pressure
   - **SPO2 (%)**
   - **Notes**
3. Save. You'll see *"Triage Created Successfully!"* and the patient moves to
   the assigned doctor's queue.

### Critical values

If any reading falls outside the hospital's safe range, the doctor sees a
**Critical Triage Values Detected** warning on that patient.

A senior nurse or administrator sets those ranges under
**Nursing Station → Settings** (*Visual Flagging Critical Values*):

| Setting | Default |
| --- | --- |
| SpO2 critical minimum / warning level | 90% / 94% |
| Systolic min / max | 90 / 180 mmHg |
| Diastolic min / max | 60 / 120 mmHg |
| Temperature min / max | 35 / 40 °C |
| Pulse min / max | 40 / 120 bpm |

You can switch flagging off with the active toggle.

---

## 5. Doctor desk

Open **Doctor Desk**. You see the visits in the doctor queue: **Patient Name**,
**PId**, **Reason** and **Assigned Doctor**. Warnings appear on a row when:

- **Critical Triage Values Detected**: a vital sign is outside the safe range.
- **Approved Lab Results Available**: results you ordered are ready.

Each row's action menu has the actions below.

### Clinical Notes (consultation)

Record **Signs and Symptoms**, **Diagnosis** and **Doctors Clinical Notes**. The
patient's **Triage Information** is shown for reference. Save.

### Send To Lab

1. Select one or more **test profiles** (for example *Full Haemogram* or
   *Renal Function*).
2. Tick or untick the individual tests (panels) inside each profile.
3. Add a note for the lab if needed, then send.

You'll see *"All Lab Requests Sent Successfully!"*. Each test is added to the
patient's invoice and the visit moves to the lab queue. If the profile has its own
price, that price is added to the invoice once. The lab can't start until the
tests are billed.

### View results

Shows each requested test with its **Result**, the normal range (**Ref Val Low**
and **Ref Val High**), and any interpretation and recommended action. You can ask
for a **Re-test** from here.

### Prescribe

1. Use **Search Drug...** to find each drug.
2. For each drug, enter **Dosage**, **Frequency** (doses per day, as a number),
   **Duration** (days, as a number), **Quantity** and an optional **Note**.
3. Add as many drugs as needed, then save.

The visit goes to the **Pharmacy** queue and the drugs are added to the invoice.

> Type **Frequency** and **Duration** as plain numbers (for example `3` and `5`,
> not "TDS" or "5 days"). The ward medication reminders depend on it.

If a drug needs consumables (for example an injection needs a syringe and a
swab), the prescription shows the **Consumables needed**. They are charged and
issued together with the drug.

### Refer Patient

Choose **Referral Type** (*Internal* or *External*), the **Service** (General,
Dentist, Cardiologist, Neurologist, Orthopedist, Psychiatrist, Surgeon,
Physiotherapist), and either a **Referred Doctor** (internal) or a **Service
Provider** and **Service Provider Email** (external). Add **Refer Notes**.

### Admit

Choose a **Ward** and an available **Bed**, enter the **Reason for Admission**,
and save. See [In-patient](#10-in-patient).

### AI triage analysis

If enabled, you can ask the AI assistant for a suggested condition based on the
patient's recent triage and consultations. See [AI assistant](#16-ai-assistant).

---

## 6. Laboratory

Open **Laboratory**. The menu across the top is:

| Tab | Use |
| --- | --- |
| **New Walk-in** | Register a patient who comes straight to the lab and order their tests |
| **Receive Samples** | Book in samples another facility has sent |
| **Phlebotomy** | Billed requests waiting for a sample to be drawn, and recent reagent usage |
| **Lab Results** | Review, approve and print results |
| **Analyzer Inbox** | Analyzer results that couldn't be posted automatically. A number on the tab shows how many are waiting |
| **Sample Archive** | Where stored samples are kept. Release, dispose of or retest them |
| **Lab Inventory** | Reagent and consumable stock in the lab |
| **Lab Settings** | Tests, prices, reference ranges, analyzers and storage (lab manager) |

### 6.1 The bench workflow

```
Request ──► Billed ──► Sample collected ──► Result entered ──► Result approved ──► Report printed
```

**Step 1. Find the request.** **Phlebotomy** lists visits waiting in the lab.
*Only tests that have been billed are shown.* If a patient says they've paid but
their test isn't listed, check with billing.

Row actions:

- **Request Information**: the requesting doctor, the tests, and the samples to
  collect.
- **Add Test**: add another test to the same visit.

**Step 2. Collect the sample.** In the request information, each sample is shown
with its **sample code**, what it is **Collected with** (the consumables needed),
and a **Collect Sample** button. Select **Collect Sample** when you have drawn
it. EasyMed takes the syringe, tube and gloves out of lab stock at that moment.
If something was short you'll see *"Sample collected, but stock was short: ..."*.
The sample is still recorded, but tell the store keeper.

Tests that use the same specimen in one visit share one sample, so you only draw
one tube. Samples sent in by another facility were drawn with their kit, so
nothing is taken from your stock for them.

**Step 3. Enter results.** Results from a connected analyzer are posted to the
sample automatically (see [Analyzer inbox](#65-analyzer-inbox)). To enter a result
by hand, open **Add Results** for the sample and enter a value for each test:

- **Quantitative** tests take a number. It's compared with the reference range
  for the patient's sex and age, and flagged if it's out of range or critical.
- **Qualitative** tests take a text result (for example *Positive* or *Negative*).

When a result is saved, the reagents for that test are taken out of lab stock.
If a professional interpretation is set up for the test, it's added
automatically, along with any **Recommended Action** and a *Requires Immediate
Attention* flag.

**Step 4. Approve.** Under **Lab Results**, select **View and approve results** on
the patient's row, then **approve** each test. Approved results become visible to
the doctor (*Approved Lab Results Available*).

**Step 5. Report.** Under **Lab Results**, select **Print results** on the row.
The printed report shows the patient, the referring doctor or
facility, then each test's result, unit, flag and reference range. Results
outside the range are in bold and marked **L** (low) or **H** (high). A
qualitative test prints only its typed result, across the width of the row. Any
interpretation follows, with its line breaks kept as you typed them in Lab Settings,
then an **End of Report** line. The foot of the last page carries the sign-off for
**Requested By**, **Done By** and **Approved By**. Approved By shows the name,
profession, registration number, contact and signature of whoever approved the
results, as recorded on their user account (see [Administration](#17-administration)).

To group a test's results under headings, such as RBC, WBC and Platelets, put its
panels in sub profiles. Sub profiles print in their **Report Order**, after any
panels left directly on the main profile, and each sub profile's panels print in
their own **Report Order**. A panel with the same name as its sub profile prints
its result on the heading's row.

### 6.2 Walk-in patients

For patients who come straight to the lab (with or without a referral), select
**New Walk-in**:

1. **Patient**:
   - **Returning patient**: search by name, patient number or phone (type at
     least two letters).
   - **New patient**: enter **First name**, **Last name**, **Sex** and **Date of
     birth**. If you only know the age, select **Only know the age?** and enter it
     in years. **Phone** is optional, but without it the patient can't be told by
     text message when results are ready.
2. **Referred by (optional)**: **Referring doctor** and **Referring facility**.
   These are printed as *Requested by* on the report.
3. **Bill to**: leave **Patient pays at the till**, or choose a credit account.
   Accounts already on the patient's file are marked *(on file)*.
   - A **corporate client** or **referring facility** is billed on account straight
     away. The tests go onto **Phlebotomy** without a stop at the till, and the
     account settles against its monthly statement.
   - An **insurer**'s tests still go through the cashier, who checks cover first.
4. **Tests**: pick a test profile, then tick the tests inside it. Use **Add
   Another Test Profile** for more. The number of tests and the total are shown at
   the bottom.
5. Add a **Note for the lab** if needed, then select **Create Request**.

EasyMed creates the visit, the lab request and the invoice lines all at once,
and shows a summary with the patient's name and track number:

- If the patient pays, select **Bill & Take Payment** to open billing for that
  invoice. The tests appear under **Phlebotomy** once billed.
- If the tests went on an account, select **Go to Phlebotomy**.

> From **Patients**, the row action **Request Lab Tests** opens this form with the
> patient already chosen.

### 6.3 Receiving samples from other facilities

Use **Receive Samples** when a clinic or hospital sends samples for you to test.
The sending facility must first exist as a credit account of type **Referring
facility** (see [Billing settings](#billing-settings-finance-manager)). If none
exists, the screen tells you where to add one.

1. **Consignment**: choose the **Sending facility**, check **Received at** (it
   starts at now), and enter who **Brought** it (courier, rider). Attach the
   **Request form** as a scan or photo (PDF, PNG or JPG) and add a **Note** if
   needed.
2. **Each patient on the form** (select **Add Another Patient** for more):
   - their **First name** and **Last name**, or tick **Coded sample** when the form
     only gives their number (for example a CCC or study number). A coded sample
     needs that number;
   - **Sex**, their reference or patient number, **Age (years)** or **Date of
     birth** if on the form, the **Requesting clinician**, who it was **Collected
     by** and when it was **Collected at**;
   - **Condition on arrival**: *Acceptable*, *Haemolysed*, *Clotted*, *Lipaemic*,
     *Insufficient volume*, *Leaked or broken*, *Unlabelled or mislabelled*,
     *Wrong container* or *Delayed in transit*;
   - **Reject** if the sample can't be run, with the reason (for example
     *haemolysed, please redraw*);
   - the **tests** asked for on the form.
3. Select **Book In Samples**. You'll see the consignment reference and how many
   patients were booked in and rejected.

What happens next:

- Accepted samples are billed to the facility's account and go straight onto
  **Phlebotomy**. Nobody needs to take payment.
- Rejected samples are not charged. The facility is told, with the reason, so
  they can redraw: by email if its account has an email address, and by text
  message if it has a phone number.
- If the form gave no sex or age, the report prints *Not given*.

**Recent consignments** lists what has been booked in, with a link to view each
request form.

### 6.4 Results-ready messages

When every test on a visit has an approved result, EasyMed tells whoever needs to
act on it:

| Patient | Who is told | How |
| --- | --- | --- |
| A walk-in that none of your doctors is treating, with a phone number | The patient | Text message (and WhatsApp, if set up) saying the results are ready, with the track number. The results themselves are never sent to a phone |
| Sent in by, or referred by, a facility with a credit account and an email address | The facility | The report, emailed as an attachment |
| Seen by one of your doctors | Nobody is messaged | The doctor sees *Approved Lab Results Available* |

Each message is sent once per visit.

### 6.5 Analyzer inbox

Connected analyzers send their results to EasyMed, which posts them to the right
tests when the sample code matches and the analyzer's test code is mapped. When a
result can't be posted, it waits in the **Analyzer Inbox**. Nothing is lost: fix
the cause and the result is posted.

- Switch between **Needs attention**, **Posted** and **All (30 days)**, or search
  by sample code.
- Results are grouped by run: the time, the analyzer, the sample code, the
  patient name the analyzer sent, and how many results it holds. **View message**
  shows the message exactly as the analyzer sent it.

| Status | What to do |
| --- | --- |
| **No sample code** | The code wasn't entered on the analyzer. Select **Assign sample** and enter the code from the tube label. Every result in that run is posted to it |
| **Sample not found** | Check the code, or register the sample, then select **Retry** |
| **Unmapped** | Select **Map code** and link the analyzer's code to a test panel |
| **Not requested** | Add the test to the request and **Retry**, or **Ignore** |
| **Already approved** | The approved result was kept. **Ignore**, or un-approve it and **Retry** |
| **Invalid** | The value can't be stored. Enter it by hand and **Ignore** this one |

**Retry all** tries every open result again, for example after adding mappings.

If the inbox says an analyzer is *not recognised*, copy the name it calls itself
into that equipment's **Sender ID** in **Lab Settings → Lab Equipments**.

### 6.6 Public lab requests

Tests requested from the public website appear on the **Public Lab Requests** page
(`/dashboard/laboratory/public-lab-requests`). It isn't in the lab menu, so
bookmark it. Use **Convert request** to turn one into a real lab request.

### 6.7 Sample archive

Keep track of where stored samples are physically kept. The tabs are **Patient
Sample** (collected samples not yet released), **Archive Sample** and **Released
Sample**.

1. Under **Lab Settings → Archive Settings**, build your storage layout:
   **Archive** (for example *Fridge 1*) → **Component** (rack, shelf) →
   **Section** (bin, box) → **Rack** (shelf, drawer) → **Position** (for example
   *A1*).
2. In **Sample Archive**, select **Archive a Patient Sample**, then pick the
   sample and a free position.
3. Each archived sample has these actions:
   - **Dispose**: logs the disposal and frees the position.
   - **Retest**: sends the sample back for retesting and frees the position.
   - **Release Sample**: records the sample being sent to an external facility,
     including the name of the receiving lab technician.

Disposed, retested and released samples each have their own history list.
Every specimen type has a maximum archive duration in days.

### 6.8 Lab inventory

**Lab Inventory** shows reagent and consumable stock in the lab: what's
**In stock**, **Reagent Stock Alerts** (low or out), **Recent Reagent Usage**,
and a **Reagent Consumption Report** for a chosen period.

### 6.9 Lab settings (lab manager)

| Tab | What you set up |
| --- | --- |
| **Specimens** | Specimen types (Blood, Urine...), the consumables used to collect each, and the maximum archive duration |
| **Test Profiles** | Groups of tests ordered together. A profile is either a **main profile** or sits under one as a sub profile (**Part Of (Main Profile)**), which prints as a heading on the report. **Report Order** sets the print order among sub profiles of the same main profile (lower prints first). **Sale Price** is charged once when the profile is requested, on top of any price on its panels: set it on the main profile and leave its panels at 0 |
| **Lab Equipments** | Analysers: **Equipment Name**, **IP Address**, **Communication Port**, data format (**HL7**, **ASTM**), connection mode (**TCP**, **RS232**, **NETSHARE**) and **Sender ID** (the name the analyzer puts in its messages; leave it blank if unsure and copy it from the Analyzer Inbox later). **Test mappings** links each analyzer code (for example `HGB`) to a test panel |
| **Test Panels** | Individual tests: name, profile, specimen, units, quantitative or qualitative, **turnaround time (TAT) goal**, **Sale Price**, and the **reagents** each run uses (**Units per run**). **Report Setup** shows whether a quantitative test is missing its unit or reference range |
| **Reference Values** | Normal and critical ranges by **Sex** and age range. Leave an age blank for no limit on that side, or both for every age |
| **Professional Interpretation** | Interpretation, recommended action and *Requires Immediate Attention* per profile. The interpretation can hold headings, lists, tables and uploaded images, up to about 1.5 MB of images in total, and prints on the report as laid out. Images print on the report only, not on the result screens, and images linked from a website are removed on saving, so upload them instead |
| **Archive Settings** | The storage layout (see above) |
| **Global Settings** | Default turnaround-time goal in minutes (used when a test has none) |

Getting a new test ready to sell:

1. Create the reagent and consumable items in **Inventory** (category *Lab
   Reagent* / *Lab Consumable*) and receive stock into the **Lab** location.
2. Create or choose the **Specimen** and list its collection consumables.
3. Create the **Test Panel**: give it a **Sale Price** (or 0 if it's only sold as
   part of a priced profile) and add its reagents with the units each run uses.
4. Add **Reference Values**.
5. If the lab runs it on an analyzer, add a **Test mapping** for it on that
   equipment.

> **A unit or reference range is blank on the report.** The report prints what is
> set up for each test. On **Test Panels**, click **Show these panels** to list
> the tests missing a unit or reference range, then add them. A range is also
> blank when the test has ranges but none matches the patient's sex and age, so
> check that the ranges cover that patient. A result with no range can't be
> flagged, so a blank flag only means *in range* when a range is printed.

> **"Cannot be billed: the lab cannot run it."** If a test's reagents are not in
> Lab stock, billing refuses the test and names the missing reagent. Receive the
> reagent into Lab stock, then bill again.

### 6.10 Lab performance metrics

The lab dashboard shows turnaround-time performance against the TAT goal, test
volumes and inventory metrics. Use **Print** to get a PDF for a chosen
**Report Period**.

---

## 7. Billing: charging the patient

Open **Finance → Accounts Receivable → Billing**.

1. **Select A Patient**. Only patients with pending invoices are listed.
2. Select one of the patient's **Invoices** (one per visit, listed by date).
3. Items waiting to be billed are grouped by category: **Appointments**,
   **Lab Test Requests**, **Prescribed Drugs**.
4. For each item, choose the **Pay Mode** (*Cash*, or one of the patient's
   insurers or other credit accounts). The **Price** is looked up automatically.
5. Select **bill** next to the item. The button appears once a pay mode is
   chosen and a price is found. You'll see *"Item billed successfully"*.

### Billing everything at once

Choose each item's pay mode (Cash is picked for you), then select **Bill All
Items**:

1. EasyMed asks you to confirm how many items will be billed.
2. It bills them one at a time, and the button shows **Processing...**.
3. When it finishes, it tells you how many items were billed, and names any it
   couldn't bill. Each of those also shows its own reason, for example a stock
   shortage. Fix the cause and bill those items again.

If everything on the invoice is already billed, it tells you so and does nothing.

### Profiles with their own price

When a test profile has its own price (for example a *Urinalysis* report), the
invoice shows one line for the profile carrying the price, and a line at **0** for
each test inside it. Bill **all** of them: the 0 line is what releases each test to
the lab. **Bill All Items** is the quickest way.

### How prices are chosen

| Pay mode | Price charged | Who owes it |
| --- | --- | --- |
| Cash (or mobile money or bank) | The item's current cash price | Patient |
| A credit account, with an agreed price for this item | The account's part + the patient's **co-pay** | The account pays its part, the patient pays the co-pay |
| An **insurer**, with **no** agreed price | Cash price. You'll see *"No insurance price set for this item. Using cash price."* | Patient |
| A **corporate client** or **referring facility**, with **no** agreed price | Cash price | The account |

### Things to know

- **Account items may already be billed.** Items charged to a corporate client
  or referring facility are billed the moment they're ordered, so they show as
  billed when you open the invoice. Insurer items wait for you, so you can check
  cover first.
- **A billed price never changes.** If the price list changes tomorrow, today's
  bill stays as it was.
- **You can't change the quantity of a billed item.** Check the quantity before
  you select **bill**. To correct a billed item, have an administrator issue a
  [credit note](#credit-notes-administrators) and raise the item again.
- **Billing can be refused for stock reasons.** The message names the item and
  what's missing. For example:
  - *"Insufficient stock for Amoxicillin at Pharmacy: need 21, 10 available."*
  - a lab test whose reagent is out of stock;
  - an injection whose required syringe is out of stock.

  Ask the store keeper to receive or transfer stock, then bill again.
- **Billing a drug takes it out of pharmacy stock.** The pharmacist then hands it
  over (see [Pharmacy](#9-pharmacy-dispensing)).
- **Settled invoices are sent to KRA.** Where eTIMS is set up, an invoice is sent
  to eTIMS automatically once it's fully paid, with the facility's KRA PIN.

### Discounts (administrators)

Only administrators see the discount controls. A discount comes off what the
**patient** pays. An insurer's or employer's price is agreed, so credit is never
discounted.

| Discount | When | How |
| --- | --- | --- |
| **On one item** | Before you bill the item | Enter the amount in the item's **Discount** box, then select **bill** |
| **On the total** | After items are billed | Enter the amount in **Discount on total**, then select **Apply** |

The discount on the total only covers items that are already billed, so bill
everything first. It's shared across those items. Applying a new amount replaces
the old one, and applying `0` removes it.

Neither discount can take an item below what has already been paid on it. Use a
credit note instead.

The summary at the bottom reads **Cash − Discount + Credit = Total**.

### Credit notes (administrators)

A credit note reverses something already billed and reduces what the customer
owes. Open **Finance → Accounts Receivable → Credit Notes**. Everyone with access
can see the list and print a note, but only administrators can issue one.

1. Search for the invoice by number or patient name.
2. Tick the items to credit, or select **Whole invoice**. To credit part of an
   item, lower its **Credit** amount.
3. Enter the **Reason**.
4. Leave **Put stock back on the shelf** ticked if the goods came back. It only
   applies to items credited in full. Reagents and draw kits already used stay
   used.
5. Select **Issue Credit Note**.

A credit note can't be edited afterwards. To correct one, issue another.

> **Refund Due** shows money already paid on what you credited. EasyMed records
> that it is owed back but doesn't pay it out, so account balances don't change.
> Handle the refund itself outside the system. Credit notes also aren't sent to
> KRA.

---

## 8. Receiving payments

Open **Finance → Accounts Receivable → Receive Payments**.

1. **Category**: choose *Cash* (the patient pays) or *Credit* (an insurer or other
   credit account pays).
2. **Customer**: the patient, or the credit account.
3. **Select Invoices**: tick the invoices this payment covers. The **Total Owed**
   is shown.
4. **Payment Details**:
   - **Payment mode** (the account the money goes into, for example *M-Pesa*,
     *Cash* or a bank account);
   - **Pay Amount**;
   - **Reference Number** (M-Pesa code, bank transfer number...). This is
     required;
   - **Payment Date**.
5. Check the **Payment Summary**. It shows **Fully Paid**, **Underpayment
   (Amount Due)** or **Overpayment (Excess)**, then confirm.

EasyMed applies the money to the oldest unpaid items first:

- a **patient** payment covers cash items in full, plus the co-pay on insured
  items;
- a **credit account** payment covers only that account's share of its own items.

Each payment produces a **receipt**. Find past receipts under **Payment
Receipts** and print them from there.

### Other Accounts Receivable tabs

| Tab | Use |
| --- | --- |
| **Invoices** | All invoices, paid and unpaid. Filter by status and date, and print an invoice from here |
| **Credit Notes** | Reversals of billed items (see [Credit notes](#credit-notes-administrators)) |
| **Debtors** | Who owes money: patients and credit accounts |
| **Reports** | Billing reports (see [Reports](#14-reports)) |
| **Settings** | Credit accounts, agreed prices and payment modes (see below) |

### Billing settings (finance manager)

**Finance → Accounts Receivable → Settings** has three tabs.

**Credit Accounts.** Anyone other than the patient who is billed for the patient's
care and settles later. Enter the **Account name**, the type, and the **Contact
person**, **Email**, **Phone** and **Address**, then select **Add Account**. A
payment mode with the account's name is created automatically, and it's what
the cashier picks to bill the account.

| Type | Use it for | When its items are billed | Item with no agreed price |
| --- | --- | --- | --- |
| **Insurer** | Insurance companies | By the cashier, who checks cover | The patient pays the cash price |
| **Corporate client** | Employers who pay for their staff | As soon as ordered | The account pays the cash price |
| **Referring facility** | Clinics that send samples or patients to your lab | As soon as ordered | The account pays the cash price |

A referring facility's **email** is where its patients' lab reports are sent, and
where it's told about rejected samples.

Row actions:

- **Edit Account**.
- **Statement**: choose a **Month** to see the **Statement of Account**: balance
  brought forward, charges, payments and the **Amount due**. Select **Download
  PDF** to send it to the account.

**Agreed Prices.** For each item and account, set the **Sale Price** (what the
account pays) and the **Co Pay Amount** (what the patient pays).

**Payment Modes.** Add or update payment modes (*Cash*, *Mobile Money*, *Bank
Transfer*, *Direct to Bank*). One mode is the default for cash billing.

---

## 9. Pharmacy: dispensing

Open **Phamarcy**. The list shows visits in the pharmacy queue.

1. Open the visit's prescribed drugs.
2. The table shows each drug, the quantity to dispense, and whether it is
   already **Dispensed**. Any consumables the drug needs are listed with it, so
   you can spot a shortage before dispensing.
3. Select the drugs you're handing over.
4. Select **Dispense**.
   - The button reads **Not Paid** if the selected drugs haven't been billed
     yet. Send the patient to billing first.
   - The button reads **Select Drug** until you select something.

Stock is taken out of pharmacy stock when the drug is **billed**. **Dispense**
records that you handed it over.

### Other pharmacy screens

| Screen | Use |
| --- | --- |
| **Pharmacy Inventory** | Pharmacy stock, **Re-order Levels**, **Short Expiries** |
| **New Invoice** | Sell over the counter |
| **Create Requisition** | Ask the stores for more stock (see [Procurement](#12-procurement-and-paying-suppliers)) |
| **Public Prescriptions** | Prescriptions patients uploaded on the website. Update their status |
| **Settings** | **Categories**, **Modes of Administration**, **States** (tablet, syrup...) and **Drug Specifics**, which links a drug item to its category, mode and state |
| **Print** | Pharmacy dashboard report (PDF) |

---

## 10. In-patient

Open **In-patient**. The tabs are **Admit Patients**, **Wards** and
**Inpatient Settings**. Only doctors can admit and discharge. Doctors and senior
nurses manage schedules, ward-round vitals and nurse duties.

### Set up wards and beds (once)

Under **Wards**, add each ward: name, **Ward Type** (*General*, *Maternity*,
*Pediatrics*, *Amenity*), **Ward Gender** and **Ward Capacity**. Then add its beds:
**Bed Number** and **Bed Type** (*Manual*, *Semi-Electric*, *Fully Electric*,
*Bariatric*). Beds show as **Available** or **Occupied**.

### Admit a patient

From the Doctor Desk or Check-In queue, select **Admit**. Choose **Select Ward**
and **Select Bed** (only available beds are shown), enter the **Reason for
Admission**, and save. The patient gets an admission number (`IP-...`) and the
bed is marked occupied.

### Caring for an admitted patient

Open the patient from **Admit Patients**. The admission page shows:

- **Admission details**: patient, ward, bed, admission date, who admitted them,
  and the reason.
- **Vitals**: record ward-round vitals.
- **Prescription**: drugs prescribed during the stay.
- **Tests**: lab tests ordered during the stay (**Select Test Profile**,
  **Select Panels**).
- **Schedules**: plan when drugs and tests are due (**Add Schedule**, with
  dosage, frequency and duration). **Next Schedule** shows what's coming up.
- **Invoices**: everything billed during the stay.

### Nurse duties

Under **Nurse Duties**, assign nurses to wards (one ward per nurse) and update
assignments as shifts change (**Reassign Nurse**).

### Medication reminders

Every hour, EasyMed checks for doses due in the next hour for admitted patients
and sends an on-screen message to the ward:

> *"The following medications are due within the next hour: Patient IP-... in
> bed 4, needs 500 mg of Amoxicillin at 14:00. Please collect them from the
> pharmacy."*

Keep the ward screen open to receive these messages.

### Discharge

From the admission, choose **Discharge Patient**, then the **Discharge Type**:

| Type | Notes |
| --- | --- |
| **Normal** | Patient goes home |
| **External Referral** | You must also enter the referral (**Refer Service**, **Service Provider**, **Service Provider Email**) |
| **Deceased** | Select the morgue |

Add discharge notes and save. The bed becomes available again.

---

## 11. Inventory and stores

Open **Inventory**. The tabs are **Inventory** (stock on hand), **Items**,
**Stock Movements**, **Reports** and **Supplier Invoices**.

### Key ideas

- **Stock is counted in the smallest unit.** You buy in boxes but stock is kept
  in tablets, pairs, tests or millilitres. A *pack* (Box, Strip, Carton) is
  defined by how many base units it holds, for example *Box = 100 tablets*. When
  goods are received, EasyMed converts them once.
- **Stock belongs to a location.** Pharmacy, Lab, Main Store and so on each
  hold their own stock. Move it between locations with a transfer.
- **Lots and expiry.** Each delivery is recorded as a lot with a **Lot Number**
  and **Expiry Date**. Stock is issued **first expiry, first out** (FEFO).
  Expired stock is written off automatically overnight.
- **Every change is recorded.** Nothing is ever overwritten, so **Stock
  Movements** is a complete history.
- **Available ≠ on hand.** Stock promised to a patient (for example a prescribed
  drug that isn't billed yet) is held for 24 hours and can't be sold to someone
  else in the meantime.

### Who can bring stock in

Receiving stock is limited to:

- system administrators;
- the **head of the department** receiving the stock (for their own department);
- users individually given **inventory rights** by a system administrator.

Anyone else who tries gets: *"Only a systems administrator, the departmental
head, or a user granted inventory rights may update stock inwards."*

### Items (the catalogue)

**Items → new item**:

| Field | Notes |
| --- | --- |
| **Item Code**, **Item Name**, **Description** | |
| **Category** | Drug, Lab Reagent, Lab Consumable, Lab Test, General / Specialized Appointment, Surgical Equipment, Furniture, General |
| **Resale** or **Internal (Consumable)** | Whether it's sold or used up internally (syringes, swabs) |
| **Base Unit** | The smallest unit stock is counted in. Required |
| **Pack sizes** | **Pack name** and size. Mark which pack is the **Default on receiving** and the **Default on issuing** |
| **Selling Price** | Cash price. Not used for lab reagents and consumables, which are **Not sold as stock** (the lab sells the test instead) |
| **Consumables (accompaniments)** | Items this one always needs, for example an injection needs a syringe. Set **Qty per use** and whether it's **Required** (billing is blocked if it's out) |
| Re-order level, VAT rate, slow-moving period | |

Services (lab tests, appointments) have a price but no stock.

You can **export** the catalogue to Excel and **import** items from Excel.

Changing a selling price takes effect from today. Earlier bills keep their
original price.

### Stock on hand

**Inventory** shows the quantity per item and location, lot and expiry. Filter
by location (**All locations** or one) and category. Open an item to see its
**stock card**: every movement in and out with the running balance.

### Stock movements

**Stock Movements** lists every movement in and out with the **Reason**, location
and cost. Filter by reason: *Opening balance*, *Goods received*, *Sale /
dispense*, *Internal consumption*, *Transfer in*, *Transfer out*, *Return to
supplier*, *Return from ward*, *Wastage*, *Expiry write-off*, *Stock take
adjustment* or *Reversal*, or show **All movements**. Use it to answer "where did
this stock go?".

### Adjustments, transfers and stock takes

These screens aren't in EasyMed yet. EasyMed can already record stock
adjustments, transfers between locations, stock takes and reversals, but there
are no buttons for them. Until there are, ask your system administrator to make
these changes.

Expired stock is written off automatically every night, so you don't need to
adjust it out by hand.

### Low stock, expiry and reports

- Users in groups with *inventory notifications* receive emails when items reach
  their re-order level.
- The Inventory and Pharmacy dashboards show **Re-order Levels**, **Short
  Expiries**, slow-moving items and **Stock Value at Cost**.
- **Reports → Gross Margin** shows **Revenue billed** (split by payer), the **Cost
  of what was consumed**, the **Gross margin**, and **Where stock went**.

---

## 12. Procurement and paying suppliers

Open **Finance → Accounts Payable**. The tabs are **Requisitions**, **Purchase
Orders**, **Receive Items**, **Invoices**, **Aging Statements**, **Make Payments**,
**Payment History** and **Creditors**.

### The purchasing cycle

```
Requisition ──► Approved (department) ──► Approved (procurement) ──► Purchase Order ──► Goods received ──► Supplier invoice ──► Payment
```

1. **Requisition.** A department asks for stock. For each item, enter the
   **Quantity Requested**, the pack, and a preferred supplier.
2. **Approval.** The department head, then procurement, approve and set the
   **Quantity approved**. An approver can **reject** a requisition (with a
   reason), the requesting department can **cancel** it, and either can
   **reopen** it if that was a mistake.
3. **Purchase order (LPO).** Select **Generate PO** to turn approved lines into
   a purchase order to a **supplier**. Print or download the PO as a PDF.
4. **Receive items.** When the delivery arrives, open **Receive Items → new**.
   Enter the supplier invoice number and, for each line: the **Quantity
   Received**, pack, **Purchase Price**, **Sale Price**, **Lot Number**,
   **Expiry Date**, and the location it's **Received in**. Saving records the
   supplier invoice, the **Goods Received Note** and the stock in one step. If
   any line fails, nothing is saved, so you can fix it and try again.
5. **Supplier invoices.** Track each invoice under the **Invoices** tab (see
   below).
6. **Make Payments.** Choose the **supplier**, then the account to pay from.
   **Select Invoices to Pay**, then enter the **Payment Amount**, reference and
   date. The payment is applied to the selected invoices and recorded under
   **Payment History**. Receipts can be printed.

**Creditors** shows who you owe. **Aging Statements** is coming soon. Until then,
use the **Age (Days)** column on the **Invoices** tab.

### Supplier invoices

The **Invoices** tab lists every supplier invoice with its **Amount**, **Paid**,
**Outstanding** and **Status**. Totals for the invoices showing appear above the
table.

| Status | Meaning |
| --- | --- |
| **Pending** | Nothing paid yet |
| **Part Paid** | Some paid, the rest still owed |
| **Paid** | Settled in full |

**Find an invoice.** Use the **All / Pending / Paid** buttons, the **Supplier**
list, **From Date** and **To Date**, or search by invoice number, supplier or PO
number. **Pending** shows everything still owed, including part-paid invoices.

**See how old it is.** **Age (Days)** counts from the day the invoice was recorded.
It turns orange after 30 days and red after 60. Paid invoices show a dash.

**Look inside.** From the row's action menu, select **View Invoice** to see the
items received and every payment, with its reference, the account it came from
and a link to its receipt.

**Pay one invoice.** From the row's action menu, select **Record Payment**:

1. Choose the account to **Pay from**. Only active accounts with money in them are
   listed.
2. Check the **Amount**. It starts at what's outstanding. Lower it for a part
   payment.
3. Enter the **Reference Number** (M-Pesa code, cheque number...) and the **Payment
   Date**.
4. Select **Record Payment**.

The money comes off the account's balance and a receipt is added to **Payment
History**. An invoice only shows as paid once its payment has been recorded.

To pay several invoices at once, select **Make Payments**. If you've filtered by
supplier, that supplier is already chosen.

**Export.** **Export CSV** and **Export PDF** cover the invoices your filters
select, not just the current page.

---

## 13. Cash and cash equivalents

Open **Finance → Cash and Cash equivalents**. This shows every money account and
its balance:

- **Main accounts**, such as *Cash*, *Bank*, *Mobile Money*. A main account's
  balance is the total of its sub-accounts.
- **Sub-accounts** belong to a main account and are linked to a payment mode (for
  example *Account: ABSA Bank* or *M-Pesa till*). A sub-account's balance is its
  opening balance, plus payments received into it, minus supplier payments made
  from it, plus or minus any transfers.

### Moving money between accounts (administrators)

Use a transfer when money moves between your own accounts, for example from M-Pesa
to the bank or from the bank to petty cash.

1. Select a main account's row to show its sub-accounts.
2. On the sub-account the money is leaving, open the action menu at the end of
   the row and select **Transfer**.
3. Enter the **Transfer Amnt**, choose the **To Accnt**, and check the **Date**.
   It starts at today. You can pick an earlier date but not a future one.
4. Select **Transfer**. Both balances change straight away.

You can't transfer more than the account holds, or use an inactive account.

The **Transfers** tab lists every transfer, with who made it. Each transfer also
appears in **Transactions** as a **Transfer Out** on one account and a **Transfer
In** on the other.

**Correcting a mistake.** Transfers can't be edited or deleted. On the **Transfers**
tab, select **Reverse** to send the money back. This adds a new transfer dated
today and keeps the original on record. Each transfer can be reversed once, and
only while the money is still in the account it went to.

An account with transfers on record can't be deleted.

### Setting up accounts

Under **Settings**, create main accounts and sub-accounts and set each
sub-account's opening balance, minimum and maximum balance and transaction
limits. Patient payments go **into** a sub-account and supplier payments come
**out of** one, so every payment must name a sub-account.

The **accounting summary** compares money received against money paid out for a
date range, grouped by account, and can be downloaded as a PDF.

---

## 14. Reports

| Report | Where | What it shows |
| --- | --- | --- |
| Sale by Date Range | Billing reports | Every item sold between two dates (PDF) |
| Sale by Date Range and Item | Billing reports | Sales of one item between two dates (PDF) |
| Totals per payment mode | Billing reports | Sales on a day for one payment category |
| Statement of Account | Accounts Receivable → Settings → Credit Accounts → Statement | One credit account's charges, payments and amount due for a month (PDF) |
| Accounting summary | Finance | Money in vs money out, by account (PDF) |
| Gross Margin | Inventory → Reports | For each item: revenue, cost (drug cost, reagents used, collection consumables) and margin, for a date range and optional category |
| Stock value, re-order levels, slow-moving, short expiries | Inventory and Pharmacy dashboards | Stock health |
| Reagent Consumption Report | Laboratory → Lab Inventory | Reagents used over a period |
| Lab performance | Laboratory dashboard → Print | Turnaround time and volumes |
| Pharmacy report | Pharmacy → Print | Pharmacy dashboard figures |
| Lab result report | Laboratory → Lab Results → Print | Patient results |
| Invoice, receipt, prescription, PO, GRN, requisition | Print buttons on each record | Printable documents |

About the Gross Margin report:

- The cost of a sample's syringe, tube and gloves is shared equally between the
  tests run on that sample.
- Items with no recorded cost (for example consultations) are listed separately,
  so you can see how much of the margin is actually measured.
- When you pick a date range, the sales report covers from the start date up to,
  but not including, the end date. To include a whole day, set the end date to
  the following day.

---

## 15. Announcements

Open **Announcements** to read and post notices to staff.

- **Channels** group announcements by topic or department. Select a channel to
  see its posts.
- Post an **announcement** with a title, a short message and an optional file.
- **Comment** on announcements.

Doctors, nurses and lab technicians can post. Messages are short, so attach a
file for anything longer. Administrators manage channels under **Settings →
Announcements**.

---

## 16. AI assistant

The AI assistant (**AI Triage Analysis**) suggests a likely condition from a
patient's recent triage and consultation records. It needs **at least two triage
records and two consultations** for the patient. With less than that, it tells
you there isn't enough data.

1. Request an analysis for the patient (from the Doctor Desk or the AI
   assistant page).
2. Wait while it reviews triage data, processes the medical history and
   generates recommendations.
3. Read the suggestion.

> The suggestion supports your judgement. It is **not** a diagnosis. The
> patient's records are sent to an external AI service (Google Gemini) to
> produce it, so follow your facility's policy on using it.

---

## 17. Administration

Open **Settings** (the admin area). It has **Users And Rights**, **Company**,
**Announcements**, **User Guide** (this guide) and **Docs**.

### Users and rights

**Users And Rights** has the tabs **Patients**, **Laboratory Staff**, **Doctors**,
**Nurses** and **Permissions**.

- **Create User**: **Basic Information** (name, gender, birth date), **Contact
  Information**, the **role** (Doctor, Nurse, Senior Nurse, Lab Technician,
  Pharmacist, Receptionist, Sysadmin) and the **group**.
- **Edit** a user's details, including their **Profession** and **Registration
  No.** (for example their KMLTTB number). These print in the lab report's
  sign-off for whoever approved the results, so fill them in for everyone who
  approves results.
- **Assign Role**, or **Delete** a user.
- **Reset a password**: send a reset email, or set a new password directly
  (**Enter New Password** / **Confirm New Password**).
- A user's **signature** image, printed on the lab report, is uploaded by a system
  administrator in the back-office admin site.
- **Inventory rights** (receiving stock without being a department head) can't
  be granted from the Admin area yet. A system administrator grants them in the
  back-office admin site.

### Groups and permissions

Permissions decide which screens a person sees. They are given to **groups**,
and each user belongs to **one** group.

1. Create a group per job, for example *Reception*, *Lab*, *Pharmacy*,
   *Finance*.
2. Tick the permissions the group needs and confirm.

| Permission | Opens |
| --- | --- |
| `CAN_ACCESS_PATIENTS_DASHBOARD` | Patients |
| `CAN_ACCESS_RECEPTION_DASHBOARD` | Check-In, reception, lab walk-ins |
| `CAN_ACCESS_NURSING_DASHBOARD` | Nursing Station, In-patient |
| `CAN_ACCESS_DOCTOR_DASHBOARD` | Doctor Desk |
| `CAN_ACCESS_LABORATORY_DASHBOARD` | Laboratory, lab walk-ins, receiving samples |
| `CAN_ACCESS_PHARMACY_DASHBOARD` | Pharmacy |
| `CAN_ACCESS_BILLING_DASHBOARD` | Billing / Finance |
| `CAN_ACCESS_INVENTORY_DASHBOARD` | Inventory |
| `CAN_ACCESS_ANNOUNCEMENT_DASHBOARD` | Announcements |
| `CAN_ACCESS_AI_ASSISTANT_DASHBOARD` | AI assistant |
| `CAN_ACCESS_ADMIN_DASHBOARD` | Settings (admin area), including this guide |
| `CAN_ACCESS_GENERAL_DASHBOARD` | Main dashboard |
| `CAN_RECEIVE_INVENTORY_NOTIFICATIONS` | Re-order emails (not a screen) |

> **Group and role must match.** The group opens the screen; the role allows the
> actions on it. A nurse in a group with laboratory access can open the lab
> screens, but saving lab work still needs the Lab Technician role.

### Company

Under **Company**, keep the facility's details up to date. They appear on every
printed document:

- **Basic Information**: name, branch, two emails and two phone numbers.
- **Patient ID prefix** (for example `ESMED-`), which starts every new patient ID.
- **KRA PIN**, printed on invoices and sent to eTIMS.
- **Address Information**.

The **logo** printed on reports is uploaded by a system administrator in the
back-office admin site.

The **facility type** (*Hospital*, *Standalone Lab* or *Custom*) and the modules it
switches on are set when EasyMed is installed for you, and can't be changed here.
See [Standalone lab mode](#18-standalone-lab-mode).

Branches are managed here too. Insurers, employers and referring clinics are
**credit accounts**, managed under [Billing settings](#billing-settings-finance-manager).

### Announcement channels

Under **Announcements**, create and manage the channels staff post into (see
[Announcements](#15-announcements)).

### User Guide and Docs

**User Guide** is this guide. Use the contents list on the left to jump to a
chapter, or the search box to find a word.

**Docs** has short explanations of how **Billing & Invoices**, **Inventory & Pack
System** and **Lab Tests & Reagents** work behind the scenes.

### Departments

Inventory **departments** (Pharmacy, Lab, Main Store...) hold stock and receive
departmental revenue. Each department can have a **head**, who can then receive
stock into it.

---

## 18. Standalone lab mode

A facility set up as a **Standalone Lab** (decided when your EasyMed was set up)
has no reception check-in, triage, doctor desk, in-patient or radiology. Those
menus are hidden, and the system refuses to create triage, consultations,
referrals or admissions. A **Custom** facility has only the modules chosen for it,
for example a lab that also does imaging.

What a standalone lab does instead:

1. **Laboratory → New Walk-in**: register or find the patient, record the
   referring doctor and facility, choose who pays, and pick the tests.
2. **Laboratory → Receive Samples**: book in samples other clinics send. They're
   billed to the clinic's account.
3. **Finance → Accounts Receivable → Billing**: bill the patient-paid tests, then
   take payment.
4. **Laboratory**: collect samples, enter and approve results, and print the
   report. Patients and referring facilities are told when results are ready
   (see [Results-ready messages](#64-results-ready-messages)).
5. **Finance → Accounts Receivable → Settings → Credit Accounts → Statement**:
   send each account its monthly statement.

Patients, pharmacy, billing, finance, inventory and reports work as described in
the rest of this guide.

---

## 19. The patient portal

Patients can use the public site to:

- **register** an account and sign in;
- **book an appointment** or request a **lab service**, including at home
  (*Get Your Medical Service At Your Home*);
- upload a **prescription** for the pharmacy to prepare;
- see **Personal Information**, **Upcoming Appointments**, **Appointment
  History**, **Lab Requests** and **My Prescriptions**.

Bookings and uploads arrive at reception (booked appointments), the lab (public
lab requests) and the pharmacy (public prescriptions) for staff to confirm.

---

## 20. Troubleshooting and FAQ

**I can't see a menu I need.**
Your group doesn't have that permission. Ask an administrator. In a standalone
lab, clinical menus are hidden on purpose.

**I see "Not Authorized".**
Either your session expired (sign in again) or your group lacks the page's
permission.

**Saving fails with a permission error, but I can see the page.**
Your **role** doesn't allow that action, for example a receptionist trying to
admit a patient. Ask an administrator to check your role.

**"The ... module is not available to a Standalone Lab."**
Your facility doesn't use that part of the system.

**A patient's lab test isn't on the Phlebotomy list.**
It hasn't been billed. The lab list only shows billed tests. For a profile with
its own price, make sure the 0-priced test lines were billed too, not just the
profile's line.

**"Bill All Items" said some items couldn't be billed.**
Each one shows its own reason, usually a stock shortage or a missing pay mode.
Fix the cause and bill those items again. The rest are already billed.

**Billing says "Insufficient stock" or "the lab cannot run it".**
The item, its required consumable, or the test's reagent is out of stock at the
location it's issued from. Receive or transfer stock, then bill again.

**Analyzer results aren't showing on the patient's tests.**
Open **Analyzer Inbox**. Each waiting result says what's wrong and how to fix it.

**The sending clinic isn't in the list on Receive Samples.**
Add it under **Finance → Accounts Receivable → Settings → Credit Accounts** with
the type **Referring facility**.

**A patient didn't get the results-ready text.**
Only walk-ins with a phone number on file are texted, once every test on the
visit has an approved result. Patients seen by your own doctors aren't texted.

**The Dispense button says "Not Paid".**
The selected drugs haven't been billed yet. Send the patient to billing.

**I billed the wrong quantity.**
A billed item's quantity can't be edited. Ask an administrator to issue a
[credit note](#credit-notes-administrators), then raise the item again.

**The discount box is missing or won't apply.**
Discounts are for administrators only. **Discount on total** appears once at least
one item is billed. A discount can't exceed what the patient still owes.

**A supplier invoice won't let me record a payment.**
The account you chose may not hold enough money, or the invoice may already be
paid. Move money in with a [transfer](#moving-money-between-accounts-administrators),
or check the invoice's **Status**.

**The price on an old invoice differs from today's price list.**
That's expected. Items keep the price they were billed at.

**"Sample collected, but stock was short".**
The sample was recorded, but the lab stock of a collection consumable didn't
cover it. Tell the store keeper so stock can be corrected.

**An insured patient was charged the full cash price.**
That insurer has no agreed price for the item. Ask finance to add one under
**Billing settings → Agreed Prices**.

**The lab report's sign-off has no registration number or signature.**
Ask an administrator to fill in the approver's **Registration No.** on their user,
and to upload their signature in the back-office admin site.

**My password reset link doesn't work.**
Links expire after 10 minutes and work only once. Request a new one.

**Ward medication reminders aren't showing.**
Keep the ward page open. Reminders depend on prescriptions with numeric
**Frequency** and **Duration**. If they still don't appear, report it to your
administrator.

---

## 21. Glossary

| Term | Meaning |
| --- | --- |
| **Visit** | One attendance by a patient. Has a track number and an invoice |
| **Track number** | Visit reference, e.g. `20261030-4821` |
| **Patient ID** | Permanent patient number, e.g. `ESMED-1042` |
| **Queue / track** | Where a visit currently waits: reception, triage, doctor, lab, pharmacy, in-patient |
| **Walk-in** | A patient who comes straight to the lab without seeing one of your doctors |
| **Consignment** | A batch of samples sent in by another facility, with its request form |
| **Coded sample** | A sent-in sample identified only by the sender's number, not a name |
| **Phlebotomy** | The lab list of billed requests waiting for a sample to be drawn |
| **Test profile** | A group of tests ordered together, e.g. *Renal Function*. A main profile can hold sub profiles, which print as headings |
| **Test panel** | One test inside a profile, e.g. *Urea*. This is what is priced and billed |
| **Specimen** | Sample type: blood, urine... |
| **Sample code** | Label for one collected sample |
| **Analyzer mapping** | Links an analyzer's code for a test (e.g. `HGB`) to a test panel |
| **Reagent** | Chemical a test uses up when it is run |
| **Collection consumable** | Syringe, tube, gloves used to draw a sample |
| **Accompaniment** | Item that must go with another, e.g. syringe with an injection |
| **TAT** | Turnaround time: from sample to result |
| **Reference range** | Normal low–high values for a test, by sex and age |
| **Billed** | Charged to the invoice. Price is now fixed and stock has left |
| **Credit account** | Someone other than the patient who is billed and settles later: an insurer, a corporate client or a referring facility |
| **On account** | Billed to a corporate client or referring facility the moment it's ordered, settled from the monthly statement |
| **Co-pay** | Patient's share of an item billed to a credit account |
| **Agreed price** | The price a credit account pays for an item |
| **Pay mode** | Cash, mobile money, bank, or a specific credit account |
| **Receipt** | Record of one payment received |
| **Statement of Account** | A credit account's charges, payments and amount due for a month |
| **eTIMS** | KRA's system that settled invoices are sent to |
| **Base unit** | Smallest unit stock is counted in |
| **Pack** | Bigger unit you buy in, e.g. *Box of 100* |
| **Lot** | One batch of stock with its own expiry date |
| **FEFO** | First expiry, first out: the oldest-expiring stock is used first |
| **Requisition** | Internal request for stock |
| **LPO / Purchase order** | Order sent to a supplier |
| **GRN** | Goods Received Note: record of a delivery |
| **Stock take** | Physical count used to correct balances |
| **Sub-account** | A money account (till, bank, M-Pesa) under a main account |
| **Transfer** | Money moved from one of your own accounts to another |
| **Credit note** | A record reversing all or part of what was billed, reducing what the customer owes |
| **Outstanding** | What is still owed on an invoice after payments |
