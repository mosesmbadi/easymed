# EasyMed User Guide

This guide is for the people who use EasyMed every day: receptionists, nurses,
doctors, lab technicians, pharmacists, cashiers and accountants, store keepers
and system administrators.

Each chapter follows one job from start to finish. If you only do one job, read
**Getting started** and then skip to your chapter.

> Developers should read [`docs/`](docs/README.md) instead.

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

You stay signed in for up to 7 days on the same browser. EasyMed renews your
session in the background while you work. If it can't (for example, you were
away for longer than that), you'll see *"Your session has expired. Please login
again."* and go back to the login page. Anything you hadn't saved is lost, so
save forms before leaving the computer.

To sign out, use the menu at the top of the screen. Always sign out on a shared
computer.

### What you can see

What appears in your sidebar depends on two things set by your administrator:

- **Your group**, which decides which screens you can open (for example
  *Laboratory* or *Inventory*).
- **Your role** (Doctor, Nurse, Senior Nurse, Lab Technician, Pharmacist,
  Receptionist, Sysadmin), which decides what you're allowed to save on those
  screens.

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

**Pay before you serve.** Lab tests only appear on the lab bench after they are
billed, and drugs can only be dispensed after they are billed. Billing is
explained in [section 7](#7-billing-charging-the-patient).

---

## 3. Reception: registering and checking in patients

Open **Check-In**. The screen has two parts: the **check-in form** and the
**checked-in patients queue**.

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
- **Insurance Companies**: select every insurer that covers the patient. This
  decides which insurer prices are available when billing.
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
patient's invoice and the visit moves to the lab queue. The lab can't start until
the tests are billed.

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

Open **Laboratory**. The tabs across the top are **Lab Requests**,
**Lab Results**, **Sample Archive**, **Lab Inventory**, **Lab Settings**, and the
**New Walk-in** button.

### 6.1 The bench workflow

```
Request ──► Billed ──► Sample collected ──► Result entered ──► Result approved ──► Report printed
```

**Step 1. Find the request.** **Lab Requests** lists visits waiting in the lab.
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
one tube.

**Step 3. Enter results.** Open **Add Results** for the sample and enter a value
for each test:

- **Quantitative** tests take a number. It's compared with the reference range
  for the patient's sex and age, and flagged if it's out of range or critical.
- **Qualitative** tests take a text result (for example *Positive* or *Negative*).

When a result is saved, the reagents for that test are taken out of lab stock.
If a professional interpretation is set up for the test, it's added
automatically, along with any **Recommended Action** and a *Requires Immediate
Attention* flag.

**Step 4. Approve.** Under **Lab Results**, select **Approve Results**. Approved
results become visible to the doctor (*Approved Lab Results Available*).

**Step 5. Report.** Under **Lab Results**, select **Preview Results** or
**Print**. The printed report shows the patient, the referring doctor or
facility, results, reference ranges and interpretation.

### 6.2 Walk-in patients

For patients who come straight to the lab (with or without a referral), select
**New Walk-in**:

1. **Patient**: search by name, patient number or phone. If the patient is new,
   enter their **First name**, **Last name**, gender and contact details instead.
2. **Referred by (optional)**: **Referring doctor** and **Referring facility**.
   These are printed on the report.
3. **Tests**: pick the tests. Tests without a price can't be selected.
4. Add a **Note for the lab** if needed, then submit.

EasyMed creates the visit, the lab request and the invoice lines all at once.
The patient then pays at billing and the request appears in **Lab Requests**.

### 6.3 Public lab requests

Tests requested from the public website appear under **Public Lab Requests**.
Use **Convert request** to turn one into a real lab request.

### 6.4 Sample archive

Keep track of where stored samples are physically kept.

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

### 6.5 Lab inventory

**Lab Inventory** shows reagent and consumable stock in the lab: what's
**In stock**, **Reagent Stock Alerts** (low or out), **Recent Reagent Usage**,
and a **Reagent Consumption Report** for a chosen period.

### 6.6 Lab settings (lab manager)

| Tab | What you set up |
| --- | --- |
| **Specimens** | Specimen types (Blood, Urine...), the consumables used to collect each, and the maximum archive duration |
| **Test Profiles** | Groups of tests a doctor orders together |
| **Lab Equipments** | Analysers: **Equipment Name**, **IP Address**, **Communication Port**, data format (**HL7**, **ASTM**) and connection mode (**TCP**, **RS232**, **NETSHARE**) |
| **Test Panels** | Individual tests: name, profile, specimen, units, quantitative or qualitative, **turnaround time (TAT) goal**, **Sale Price**, and the **reagents** each run uses (**Units per run**) |
| **Reference Values** | Normal and critical ranges by **Sex** and age range |
| **Professional Interpretation** | Interpretation text, recommended action and *Requires Immediate Attention* per profile |
| **Archive Settings** | The storage layout (see above) |
| **Global Settings** | Default turnaround-time goal in minutes (used when a test has none) |

Getting a new test ready to sell:

1. Create the reagent and consumable items in **Inventory** (category *Lab
   Reagent* / *Lab Consumable*) and receive stock into the **Lab** location.
2. Create or choose the **Specimen** and list its collection consumables.
3. Create the **Test Panel**: give it a **Sale Price** and add its reagents with
   the units each run uses.
4. Add **Reference Values**.

> **"Cannot be billed: the lab cannot run it."** If a test's reagents are not in
> Lab stock, billing refuses the test and names the missing reagent. Receive the
> reagent into Lab stock, then bill again.

### 6.7 Lab performance metrics

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
   insurers). The **Price** is looked up automatically.
5. Select **bill** next to the item. The button appears once a pay mode is
   chosen and a price is found. You'll see *"Item billed successfully"*.

### How prices are chosen

| Pay mode | Price charged | Who owes it |
| --- | --- | --- |
| Cash (or mobile money or bank) | The item's current cash price | Patient |
| Insurance, with an agreed price for this item | Insurer's part + the patient's **co-pay** | Insurer pays its part, patient pays the co-pay |
| Insurance, with **no** agreed price | Cash price. You'll see *"No insurance price set for this item. Using cash price."* | Patient |

### Things to know

- **A billed price never changes.** If the price list changes tomorrow, today's
  bill stays as it was.
- **You can't change the quantity of a billed item.** Check the quantity before
  you select **bill**. To correct a billed item, contact your system
  administrator.
- **Billing can be refused for stock reasons.** The message names the item and
  what's missing. For example:
  - *"Insufficient stock for Amoxicillin at Pharmacy: need 21, 10 available."*
  - a lab test whose reagent is out of stock;
  - an injection whose required syringe is out of stock.
  
  Ask the store keeper to receive or transfer stock, then bill again.
- **Billing a drug takes it out of pharmacy stock.** The pharmacist then hands it
  over (see [Pharmacy](#9-pharmacy-dispensing)).

---

## 8. Receiving payments

Open **Finance → Accounts Receivable → Receive Payments**.

1. **Category**: choose *Cash* (the patient pays) or *Credit* (an insurer pays).
2. **Customer**: the patient, or the insurance company.
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
- an **insurer** payment covers only that insurer's share of its own items.

Each payment produces a **receipt**. Find past receipts under **Payment
Receipts** and print them from there.

### Other Accounts Receivable tabs

| Tab | Use |
| --- | --- |
| **Invoices** | All invoices, paid and unpaid. Print an invoice from here |
| **Debtors** | Who owes money: patients and insurers |
| **Reports** | Billing reports (see [Reports](#14-reports)) |
| **Settings** | Payment modes, insurance companies, insurance prices |

### Billing settings (finance manager)

- **Payment modes**: add or update payment modes (*Cash*, *Mobile Money*,
  *Bank Transfer*, *Direct to Bank*). One mode is the default for cash billing.
- **Insurance**: add an insurer. A matching insurance pay mode is created
  automatically.
- **Insurance prices**: for each item and insurer, set the **Sale Price** (what
  the insurer pays) and the **Co Pay Amount** (what the patient pays).

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
| **Pharmacy inventory** | Pharmacy stock, **Re-order Levels**, **Short Expiries** |
| **Create invoice** | Sell over the counter |
| **Create requisition** | Ask the stores for more stock (see [Procurement](#12-procurement-and-paying-suppliers)) |
| **Public prescriptions** | Prescriptions patients uploaded on the website. Update their status |
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
assignments as shifts change.

### Medication reminders

Every hour, EasyMed checks for doses due in the next hour for admitted patients
and sends an on-screen message to the ward:

> *"The following medications are due within the next hour: Patient IP-... in
> bed 4, needs 500 mg of Amoxicillin at 14:00. Please collect them from the
> pharmacy."*

Keep the ward screen open to receive these messages.

### Discharge

From the admission, choose **Discharge**, then the **Discharge Type**:

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

**Stock Movements** lists every movement in and out (receipts, sales, lab
usage, sample collection, expiry write-offs) with the **Reason**, location and
cost. Use it to answer "where did this stock go?".

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
5. **Supplier invoices.** Track each invoice as **Pending** or **Paid**.
6. **Make Payments.** Choose the **supplier**, then the account to pay from.
   **Select Invoices to Pay**, then enter the **Payment Amount**, reference and
   date. The payment is applied to the selected invoices and recorded under
   **Payment History**. Receipts can be printed.

**Aging Statements** shows how long supplier invoices have been outstanding.
**Creditors** shows who you owe.

---

## 13. Cash and cash equivalents

Open **Finance → Cash and Cash equivalents**. This shows every money account and
its balance:

- **Main accounts**, such as *Cash*, *Bank*, *Mobile Money*. A main account's
  balance is the total of its sub-accounts.
- **Sub-accounts** belong to a main account and are linked to a payment mode (for
  example *Account: ABSA Bank* or *M-Pesa till*). A sub-account's balance is its
  opening balance, plus payments received into it, minus supplier payments made
  from it.

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
| Accounting summary | Finance | Money in vs money out, by account (PDF) |
| Gross Margin | Inventory → Reports | For each item: revenue, cost (drug cost, reagents used, collection consumables) and margin, for a date range and optional category |
| Stock value, re-order levels, slow-moving, short expiries | Inventory and Pharmacy dashboards | Stock health |
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
file for anything longer.

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

Open the **Admin** area. It has **Users And Rights** (Users, Doctors, Nurses,
Laboratory Staff, Patients, Permissions), **Company**, **Announcements** and
**Docs**.

### Users

- **Create User**: **Basic Information** (name, gender, birth date), **Contact
  Information**, the **role** (Doctor, Nurse, Senior Nurse, Lab Technician,
  Pharmacist, Receptionist, Sysadmin) and the **group**.
- **Edit** a user's details, **Assign Role**, or **delete** a user.
- **Reset a password**: send a reset email, or set a new password directly
  (**Enter New Password** / **Confirm New Password**).
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
| `CAN_ACCESS_NURSING_DASHBOARD` | Nursing Station |
| `CAN_ACCESS_DOCTOR_DASHBOARD` | Doctor Desk |
| `CAN_ACCESS_LABORATORY_DASHBOARD` | Laboratory, lab walk-ins |
| `CAN_ACCESS_PHARMACY_DASHBOARD` | Pharmacy |
| `CAN_ACCESS_BILLING_DASHBOARD` | Billing / Finance |
| `CAN_ACCESS_INVENTORY_DASHBOARD` | Inventory |
| `CAN_ACCESS_ANNOUNCEMENT_DASHBOARD` | Announcements |
| `CAN_ACCESS_AI_ASSISTANT_DASHBOARD` | AI assistant |
| `CAN_ACCESS_ADMIN_DASHBOARD` | Admin area |
| `CAN_ACCESS_GENERAL_DASHBOARD` | Main dashboard |
| `CAN_RECEIVE_INVENTORY_NOTIFICATIONS` | Re-order emails (not a screen) |

> **Group and role must match.** The group opens the screen; the role allows the
> actions on it. A nurse in a group with laboratory access can open the lab
> screens, but saving lab work still needs the Lab Technician role.

### Company

Under **Company**, keep the facility's name, addresses, phone numbers, emails and
logo up to date. These appear on every printed document. Also set the **patient
ID prefix** (for example `ESMED-`).

Branches and insurance companies are managed here too. Insurers can also be
managed from billing settings.

### In-app docs

**Docs** has short explanations of **Billing & Invoices**, **Inventory & Pack
System** and **Lab Tests & Reagents**.

### Departments

Inventory **departments** (Pharmacy, Lab, Main Store...) hold stock and receive
departmental revenue. Each department can have a **head**, who can then receive
stock into it.

---

## 18. Standalone lab mode

A facility set up as a **Standalone Lab** (decided when your EasyMed was set up)
has no reception check-in, triage, doctor desk, in-patient or radiology. Those
menus are hidden, and the system refuses to create triage, consultations,
referrals or admissions.

What a standalone lab does instead:

1. **Laboratory → New Walk-in**: register or find the patient, record the
   referring doctor and facility, and pick the tests.
2. **Finance → Accounts Receivable → Billing**: bill the tests, then take payment.
3. **Laboratory**: collect samples, enter and approve results, and print the
   report.

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

Bookings and uploads arrive at reception (public appointments), the lab (public
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

**A patient's lab test isn't on the lab list.**
It hasn't been billed. The lab list only shows billed tests.

**Billing says "Insufficient stock" or "the lab cannot run it".**
The item, its required consumable, or the test's reagent is out of stock at the
location it's issued from. Receive or transfer stock, then bill again.

**The Dispense button says "Not Paid".**
The selected drugs haven't been billed yet. Send the patient to billing.

**I billed the wrong quantity.**
A billed item's quantity can't be edited from the billing screen. Contact your
system administrator to correct it.

**The price on an old invoice differs from today's price list.**
That's expected. Items keep the price they were billed at.

**"Sample collected, but stock was short".**
The sample was recorded, but the lab stock of a collection consumable didn't
cover it. Tell the store keeper so stock can be corrected.

**An insured patient was charged the full cash price.**
That insurer has no agreed price for the item. Ask finance to add one under
**Billing settings → Insurance prices**.

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
| **Test profile** | A group of tests ordered together, e.g. *Renal Function* |
| **Test panel** | One test inside a profile, e.g. *Urea*. This is what is priced and billed |
| **Specimen** | Sample type: blood, urine... |
| **Sample code** | Label for one collected sample |
| **Reagent** | Chemical a test uses up when it is run |
| **Collection consumable** | Syringe, tube, gloves used to draw a sample |
| **Accompaniment** | Item that must go with another, e.g. syringe with an injection |
| **TAT** | Turnaround time: from sample to result |
| **Reference range** | Normal low–high values for a test, by sex and age |
| **Billed** | Charged to the invoice. Price is now fixed and stock has left |
| **Co-pay** | Patient's share of an insured item |
| **Pay mode** | Cash, mobile money, bank, or a specific insurer |
| **Receipt** | Record of one payment received |
| **Base unit** | Smallest unit stock is counted in |
| **Pack** | Bigger unit you buy in, e.g. *Box of 100* |
| **Lot** | One batch of stock with its own expiry date |
| **FEFO** | First expiry, first out: the oldest-expiring stock is used first |
| **Requisition** | Internal request for stock |
| **LPO / Purchase order** | Order sent to a supplier |
| **GRN** | Goods Received Note: record of a delivery |
| **Stock take** | Physical count used to correct balances |
| **Sub-account** | A money account (till, bank, M-Pesa) under a main account |
