# Lab Reagents and Consumables

How the lab's stock is set up and how it is consumed: reagents used running a
test, and consumables used collecting a sample.

> **This document was rewritten after the stock-ledger migration.** The earlier
> version described an `Inventory` table and a `TestKitCounter` table, neither
> of which exists any more. If you are following instructions that mention
> either, or the `ensure_service_inventory` command, they are out of date — see
> [What changed](#what-changed) at the end.

---

## The lab does not sell inventory

A pharmacy sells what is on its shelf: a box of Panadol is bought, stocked and
sold as itself. A lab does not. There is no stock of "Urea" anywhere, and never
will be — Urea is *made*, per patient, out of a reagent, a syringe and a tube.

So the lab's sellable product is the **Test Panel**, and that is the only place
in the lab a sale price is set. Reagents and lab consumables hold no price at
all: `Item.is_sellable` is false for them, and the API refuses one.

## The two things the lab consumes

They are deliberately separate, because they are spent at different moments and
in different proportions.

| | **Reagent** | **Collection consumable** |
| --- | --- | --- |
| Model | `laboratory.TestPanelReagent` | `laboratory.SpecimenConsumable` |
| Declared on | **Test Panel** → reagent item | **Specimen** → internal consumable |
| Consumed | Once **per test run** | Once **per sample drawn** |
| Example | Running an ALT test uses 1 test's worth of Roche ALT/AST reagent | Drawing blood uses 1 syringe, 1 swab and 1 EDTA tube |
| Item category | `LabReagent` | `category_one = Internal (Consumable)` |
| Triggered by | A **result being recorded** | The sample being marked **collected** |
| Blocks anything? | **Yes** — a panel whose reagents are not in stock cannot be billed | No — the draw has already happened; the shortfall is recorded |

The split is not bookkeeping preference, it is what the two facts actually are.
Order a CBC, a Urea and an LFT off one arm and you spend **three lots of
reagent and one syringe**. Tie the syringe to the test and you charge for three.
Tie it to the specimen and you charge for one — and a **re-test off an archived
sample charges for none**, because nobody drew anything.

### And outside the lab

`inventory.ItemConsumable` still exists for the pharmacy case: a paracetamol
**injection** needs a syringe and a swab wherever it is given, and that is a
property of the drug, not of any specimen. It is declared on the item, deducted
when the item is billed, and **blocks billing** when a required one is out of
stock.

Lab items are excluded from it — `Item.supports_accompaniments` is false for
`Lab Test`, `LabReagent` and `LabConsumable` — so the same syringe can never be
claimed twice, once by the specimen and once by the test.

---

## Setting up a reagent

A reagent is an ordinary inventory item. Nothing about it is special except its
category and what it is linked to.

### 1. Create the item

**Inventory → Items → Add New Item**

| Field | Value |
| --- | --- |
| Name | `Sysmex CBC Reagent Kit` |
| Category | `Lab Reagent` |
| Base Unit | `tests` |
| Departments | `Lab` |

**The base unit is `tests`, not `kits`.** This is the single most important
choice on the form. Stock is counted in the thing you actually consume — one
test run consumes one test — so the ledger can answer "how many more CBCs can
we run?" directly.

> The system rejects a pack named the same as the base unit. An item counted in
> `kits` with a `Kit` pack would print "1 Kit = 500 kits", which is meaningless.

### 2. Add the pack you buy in

**Inventory → Items →** row menu **→ Pack Sizes**

| Pack | Holds |
| --- | --- |
| `Kit` | 500 |

One kit is 500 tests. You purchase and receive in `Kit`; the ledger stores
tests. Buying 2 kits at KES 15,000 each gives **1,000 tests at KES 30 each** —
which is exactly what the demo data holds.

> **Watch the unit on prices.** `purchase_price` when receiving is the price of
> **one pack** (per kit) and the ledger divides it down, so the kit above costs
> KES 30 a test. The reagent itself has no sale price at all — the API refuses
> one. What the patient pays is set on the **Test Panel**, and it is the price
> of **one run**: pricing a panel at the per-kit figure would charge a whole
> kit for a single test.

### 3. Link it to the panels that use it

**Laboratory → Lab Settings → Test Panels →** Create/Edit Test Panel, or the
row menu **→ Reagents** for an existing one.

`TestPanelReagent` carries `units_consumed_per_run` — how many base units one
run of that panel consumes. Usually 1, but a panel that burns two tests' worth
of reagent says `2`.

Only items whose category is `Lab Reagent` can be linked here. A syringe is not
a reagent: it belongs to the specimen the sample is drawn into.

A panel can link to several reagents, and one reagent can serve several panels:

```
  Complete Blood Count  ─┐
  Haemoglobin           ─┼─►  Sysmex CBC Reagent Kit   (1 test per run)
  White Cell Count      ─┘

  ALT  ─┬─►  Roche ALT/AST Reagent   (1 test per run)
  AST  ─┘
```

### 4. Optional: chemistry metadata

`LabReagent` holds CAS number, molecular weight and purity for a reagent item.
It is reference data only — **it plays no part in stock tracking**.

---

## Pricing the panel

**Laboratory → Lab Settings → Test Panels → Create/Edit Test Panel → Sale Price**

This is what the patient is charged. It is stored against the panel's billing
item as an effective-dated `ItemPrice`, so changing it never rewrites an
invoice already raised.

The create and edit forms also show, read-only, the items the panel's specimen
is collected with — so whoever sets the price can see the whole cost of the
test, reagents and draw together, rather than half of it.

---

## Setting up collection consumables

**Laboratory → Lab Settings → Specimens →** add or edit a specimen, then fill in
**Items required to collect this specimen**.

The consumable itself is an ordinary inventory item with **Category (Resale /
Internal)** set to `Internal (Consumable)` — only those can be picked, since a
resale item is something the patient buys rather than something spent on their
behalf.

| Specimen | Item | Qty per draw | Required |
| --- | --- | --- | --- |
| Blood | Syringe 5ml | 1 | yes |
| Blood | Alcohol Swab | 1 | yes |
| Blood | Blood Collection Tube EDTA | 1 | yes |
| Blood | Gauze Swab | 1 | no |
| Urine | Sample Container | 1 | yes |

Leaving the list empty is a real answer, not an unfinished one — it is how the
system tells "this costs nothing to collect" apart from "nobody has filled this
in".

**Required vs optional** is a matter of how loudly a shortfall is reported.
Neither stops a collection: by the time the deduction runs the tube is already
full, and refusing to record a sample that physically exists helps nobody.

### Where it shows up

- **Sample collection** (Laboratory → Phlebotomy → open the request) lists what
  the draw needs, with current stock, and flags anything short before the
  patient is in the chair. Once collected, the same panel shows what was
  **actually** issued, and a short shelf is raised as a warning to the collector.
- **Test Panel create/edit** shows the specimen's list read-only, beside the
  sale price.
- **Specimens grid** shows it per specimen.

### API

| Endpoint | Purpose |
| --- | --- |
| `GET/POST/PATCH/DELETE /lab/specimen-consumables/` | The collection links on their own; filterable by `specimen` and `item` |
| `consumable_items` on `POST/PATCH /lab/specimens/` | Declare them with the specimen; the posted list **replaces** the whole set |
| `reagent_items` and `sale_price` on `POST/PATCH /lab/lab-test-panel/` | Declare the panel's reagents and its price with the panel; the reagent list **replaces** the whole set |
| `GET/POST/PATCH/DELETE /lab/test-panel-reagents/` | The reagent links on their own |
| `consumables` / `consumables_used` on `GET /lab/patient-samples/` | What a draw needs, and what it actually spent |
| `consumable_items` on `POST/PATCH /inventory/items/` | Pharmacy accompaniments. **Rejected for lab items** |
| `GET /inventory/items/<id>/consumables/?quantity=&department=` | A drug's accompaniments against live stock, and which shortfalls would block billing. Always empty for a lab item |
| `GET /reports/gross-margin/?start_date=&end_date=&category=` | Revenue against reagent, collection and dispensed cost — see *What a test earned* |

---

## How consumption actually happens

### Reagents — when the test is run

When a result is recorded against a `LabTestRequestPanel`, `deduct_test_kit`
posts a `CONSUMPTION` movement for each linked reagent, sourced `LAB_TEST`
against that panel run.

A result appearing is the first moment the reagent has definitely been spent.
Billing used to be the trigger, which put the deduction *before the sample had
even been drawn* — a patient who paid and then went home took a test's worth of
reagent with them on paper while the bench still had it on the shelf. Affording
a test and running it are different events, and the ledger records the second.

- **FEFO** — the earliest-expiring lot is used first, and expired lots are
  skipped.
- **Idempotent per (panel, reagent)** — the signal fires on every save once a
  result exists; without this, approving the result would consume it again.
- **Audited** — every consumption writes a `ReagentConsumptionLog` row with
  stock before and after, the patient, who performed it, and a reference tying
  it back to the stock movements.

### The till will not sell what the bench cannot run

`billing.services.check_stock_available` asks the panel `can_run(runs=quantity)`
before an invoice line for a Lab Test item can be marked billed, and refuses the
line naming the reagent that is short.

This matters because a lab test is a *service* item: it holds no stock of its
own, so every other stock check waves it straight through. Without this the till
would happily sell a Urea the lab had no reagent to run. What blocks the sale is
the reagent, never the syringe — by the time a syringe matters the sample has
already been drawn, and refusing then would help nobody.

### Collection consumables — when the sample is drawn

Marking a `PatientSample` collected fires `deduct_specimen_consumables`, which
posts a `CONSUMPTION` movement for each of the specimen's items, sourced
`SAMPLE_COLLECTION` against the sample, and writes a `PatientSampleConsumable`
row recording what was issued against what was needed.

Collection is the trigger, not billing, because collection is the event that
actually spends them. Three panels off one sample share one syringe, and a
re-test off an archived sample spends nothing — both fall out of tying the
deduction to the sample rather than to the invoice line, with no special case
anywhere.

- **Run inline, not queued.** The person who pressed *Collect Sample* is
  holding the tube; the response is what tells them the shelf had what the draw
  needed. Reagent deduction stays on Celery.
- **Idempotent per (sample, item)** — the `PatientSampleConsumable` row is the
  guard, so the saves that follow a collected sample around cost nothing.
- **Never blocks.** The draw has already happened. A shortfall is issued as far
  as stock allows, recorded (`is_short`), logged, and surfaced to the collector
  as a warning.
- **Recorded, not recomputed.** The row keeps what was spent at the time, so
  editing the specimen later never rewrites what a phlebotomist already used.

### Item accompaniments — on billing (pharmacy only)

Outside the lab, accompaniments still leave stock when the item is billed, via
`billing.services.post_stock_for_invoice_item`, which calls
`inventory.services.consumables.consume`.

- **Checked first** — `billing.services.check_stock_available` runs before the
  invoice line is saved and **refuses it** when a required accompaniment cannot
  be covered at the dispensing department. The message names what is missing
  and how much of it there is.
- **Department-scoped** — availability is checked where the line is dispensed
  from (`source_tag`, else the item's category default). Syringes sitting in
  Lab do not unblock a Pharmacy dispense.
- **Idempotent per (invoice line, consumable)** — a re-saved line cannot take a
  second syringe.
- **Optional lines never block** — a shortfall on one is logged and the sale
  goes through.
- **Lab items are skipped entirely** — `consumables.requirements()` returns `[]`
  for them, so a stale link could not double-deduct even if one survived.

---

## Re-testing and referring an archived sample

**Laboratory → Sample Archive →** row menu:

| Action | What happens |
| --- | --- |
| **Retest** | Opens the lab-request modal for the sample's own attendance process. The new panels attach to the **existing** `PatientSample`, which is already collected, so no collection consumables are deducted — only the reagents each new panel burns. The archive position is freed and a `RetestSample` row records it. |
| **Release** (refer out) | Hands the sample to an external facility. `ReleasedSample` records the facility, the receiving tech and the reason. |
| **Dispose** | `DisposedSample` records it and the position is freed. |

The retest modal says this on screen, so nobody has to work it out from a stock
report afterwards.

One limit: the reuse works because a new panel attaches to whichever sample
already exists for the same attendance **and the same specimen**. A re-test that
needs a different specimen — urine, when only blood was archived — creates a new
sample, which has to be drawn and is charged when it is.

The re-tested panels are billed like any other, so the till still refuses one
whose reagents are out of stock.

---

## What a test earned

**Inventory → Reports → Gross Margin** puts each test's billed revenue beside
the reagent it burned and its share of the draw it came from, both taken off
the ledger at the unit cost they left at.

The share of the draw is the one figure there that is a convention rather than
a measurement: a sample's collection cost is **split evenly across every panel
ordered off it**, so three tests off one tube each carry a third of the syringe.
It has its own column so nobody mistakes it for a measured cost.

A test billed with no recorded consumption shows a full margin. That usually
means its reagents are not linked on the panel, or its specimen lists no
collection items; the report counts those tests rather than letting the margin
stand unqualified. Its other limits — which dates set the window, and what
happens to a test run in one month and billed in another — are listed in
`INVENTORY_FLOW.md` under *Cost of sales and gross margin*.

---

## Checking availability before running

`LabTestPanel` exposes two helpers, both reading the ledger:

| Method | Answers |
| --- | --- |
| `can_run(runs=1)` | Is there enough of every linked reagent to run it `runs` times? Returns `(ok, message)`. This is what billing calls |
| `available_runs()` | How many more times can this panel run? Bottlenecked by the scarcest reagent |

Both exclude expired lots and stock already reserved for other work, so they
answer "can we actually do this now", not "what does the catalogue say".

### Low-stock threshold

A reagent counts as low when availability drops to its **re-order level**,
which lives on `StockPolicy` per item per department — the same place every
other re-order level in the system lives. There is no separate reagent
threshold to maintain.

Reagent availability is served at `/lab/testkitcounters/`, kept at its
historic route so the lab dashboard keeps working. There is no counter table
behind it; the number is computed from the ledger and cannot drift from actual
stock.

---

## Demo data

`create_real_world_lab_data()` builds a curated set of named profiles and
reagent kits — CBC, LFT, Lipid, Kidney Function, Thyroid, Electrolytes and
Glucose — each with its panels, its reagent kits stocked through the ledger,
reference values and interpretations. `create_demo_lab_profiles_and_panels()`
adds only what that set does not cover — Urinalysis, COVID-19 PCR and Malaria.
None of them has a reagent linked, so a Urinalysis billed in the demo visits
shows up in the margin report as billed with no recorded cost.

Reagents are **not** priced. Each kit's per-kit sale figure is divided down to
a per-test price and charged on the panels that consume it: a new panel's price
is the sum of its reagents' per-test prices, or KES 500 when it has none.
Panels that already carry a price are left alone.

`create_item_consumables()` then links collection items to the seeded
specimens — the blood specimens (Blood, Serum, Plasma) get a syringe, an alcohol
swab, an EDTA tube and optional cotton wool; Urine gets a collection container
and optional gloves — and gives injectables, IV fluids and vaccines the syringe,
swab or cannula they are given with. A consumable missing from the catalogue is
skipped and reported, not invented.

Those consumables are created `Internal` and unpriced by the pharmacy seeding,
and stocked into Pharmacy. Collection issues from **Lab**, so the same step
transfers a working stock of each collection item across — up to 200, never
more than half of what the pharmacy holds — the way a real lab gets it.

`create_insurance_price_list()` then agrees prices with the five insurers
carrying the most patients, and the demo history runs: sixty days of
patients tested, collected, resulted, archived, retested and released, with
the lab reordering its reagents as they run down. What that produces, and
how to log in to see it, is in `DEMO_DATA.md`.

```bash
# Everything: users, departments, suppliers, items, lab data
docker exec -it easymed-backend python manage.py generate_dummy_data

# Price any service item (lab tests, appointments) that still has no cash price
docker exec -it easymed-backend python manage.py ensure_service_prices
```

Counts are deliberately not quoted here. The generator also creates randomised
items, so the totals in the database are larger than the curated set and drift
between runs — query them rather than trusting a number in a document.

> Opening stock for reagents is posted **through the ledger** as a real
> receipt, the same way live stock arrives. There is no path that writes a
> quantity directly.

---

## Verification

```python
# Reagent availability, in tests
from inventory.models import Item
from laboratory.utils import reagent_stock

for reagent in Item.objects.filter(category='LabReagent'):
    row = reagent_stock(reagent)
    print(f"{row['reagent_name']}: {row['available_tests']} tests "
          f"(status: {row['stock_status']})")
```

```python
# Which reagent each panel consumes, and how much
from laboratory.models import TestPanelReagent

for link in TestPanelReagent.objects.select_related('test_panel', 'reagent_item'):
    print(f"{link.test_panel.name} -> {link.reagent_item.name} "
          f"x{link.units_consumed_per_run}")
```

```python
# What each specimen costs to collect
from laboratory.models import SpecimenConsumable

for link in SpecimenConsumable.objects.select_related('specimen', 'item'):
    print(link)          # "Blood needs 1 x Syringe 5ml"
```

```python
# What a particular draw actually spent
from laboratory.models import PatientSampleConsumable

for row in PatientSampleConsumable.objects.select_related('patient_sample', 'item')[:10]:
    print(row, '(short)' if row.is_short else '')
```

```python
# What a panel sells for, and what it is made of
from laboratory.models import LabTestPanel

# Demo data can hold more than one panel of a name, hence filter().first()
panel = LabTestPanel.objects.filter(name='Urea').first()
print(panel.sale_price)                                   # charged per run
print([str(l) for l in panel.reagent_links.all()])        # reagents, per run
print([str(l) for l in panel.collection_requirements()])  # from its specimen
```

```python
# What a drug drags along -- pharmacy only; a lab item returns nothing
from inventory.models import ItemConsumable

for link in ItemConsumable.objects.select_related('item', 'consumable'):
    print(link)          # "Paracetamol 1g Injection needs 1 x Syringe 5ml"
```

```python
# Can this be billed right now, and what is missing if not?
from inventory.models import Department, Item
from inventory.services import consumables

item = Item.objects.get(name='Paracetamol 1g Injection')
pharmacy = Department.objects.get(name='Pharmacy')

print(consumables.availability(item, quantity=2, department=pharmacy))
print(consumables.check_available(item, 2, pharmacy))   # (True, '')
```

```python
# Can we run this panel right now, and how many times?
from laboratory.models import LabTestPanel

panel = LabTestPanel.objects.filter(name='Alanine Aminotransferase (ALT)').first()
print(panel.can_run())          # (True, 'OK')
print(panel.can_run(runs=500))  # (False, 'Insufficient stock ...') -- what billing asks
print(panel.available_runs())   # 2 kits x 200 tests, less any demo visits run on it
```

```python
# Audit trail for reagent consumption
from laboratory.models import ReagentConsumptionLog

for log in ReagentConsumptionLog.objects.select_related('reagent_item')[:10]:
    print(f"{log.consumed_at:%Y-%m-%d} {log.reagent_item.name}: "
          f"{log.available_tests_before} -> {log.available_tests_after} "
          f"({log.patient_name})")
```

---

## Troubleshooting

**A reagent shows zero stock.** It was never received. Reagent stock arrives
the same way all stock does — through a goods receipt, or an opening-stock
entry. Check `Inventory → Stock Movements` filtered to the item; if there are
no `RECEIPT` rows, nothing was ever posted.

**A test ran but no reagent was deducted.** Either the panel has no
`TestPanelReagent` link, or no result has been recorded against it yet. The task
logs `"No reagents configured for test panel: <name>"` in the first case and
`"Lab test panel <id> has no result yet"` in the second.

**A lab test cannot be billed.** The reagents it needs are not in Lab stock.
The message names which one and how short it is. Receive it inwards, or unlink
it from the panel if the test no longer uses it.

**Collecting a sample deducted nothing.** The specimen has no consumables
configured. Open **Lab Settings → Specimens**, edit the specimen, and add them.
The collection screen says explicitly when a specimen has none.

**A re-test deducted no syringe.** That is correct. The sample came out of the
archive — nobody drew anything. Only the reagents for the new panels are
consumed.

**A test panel shows "Not priced".** Nothing has ever been set on it. Open
**Lab Settings → Test Panels**, edit the panel, and give it a Sale Price. The
price is *not* set in Inventory: a reagent has no sale price and the API
refuses one.

**Stock went negative.** Balances are deliberately signed so drift is visible
rather than being hidden by a constraint failure. Investigate with the stock
card for that item, then correct with a stock adjustment — which records a
reason and an author.

**Availability looks wrong after a manual database change.** Rebuild the
derived balances from the movements:

```bash
docker exec -it easymed-backend python manage.py rebuild_stock_balances
```

---

## Where the code lives

| Concern | Location |
| --- | --- |
| Panel → reagent link | `laboratory/models.py` — `TestPanelReagent` |
| Specimen → collection item link | `laboratory/models.py` — `SpecimenConsumable` |
| What a draw actually spent | `laboratory/models.py` — `PatientSampleConsumable` |
| Panel price | `LabTestPanel.sale_price` / `.set_sale_price()`, stored as `inventory.ItemPrice` |
| What may hold a price, or an accompaniment | `inventory/models.py` — `Item.is_sellable`, `Item.supports_accompaniments` |
| Item → consumable link (pharmacy) | `inventory/models.py` — `ItemConsumable` |
| Requirements, availability, consumption | `inventory/services/consumables.py` |
| The billing block | `billing/services.py` — `check_stock_available` |
| Consumption tasks | `laboratory/tasks.py` — `deduct_test_kit`, `deduct_specimen_consumables` |
| What triggers them | `laboratory/signals.py` — a result being recorded; a sample being marked collected |
| Revenue against cost | `reports/margins.py`, served by `GrossMarginView` in `reports/views.py` |
| Availability, thresholds | `laboratory/utils.py` — `reagent_stock`, `reagent_threshold` |
| Pre-run checks | `LabTestPanel.can_run()`, `LabTestPanel.available_runs()` |
| The only writer of stock | `inventory/services/stock.py` |
| Audit trail | `laboratory/models.py` — `ReagentConsumptionLog` |
| Demo data | `customuser/management/utils/data_generators.py` — `create_real_world_lab_data()` |

---

## What changed

The original version of this document described a design that no longer exists.
Recorded here so anyone following older instructions can see why they fail.

| Then | Now |
| --- | --- |
| Reagents were consumed when the panel was **billed**, which could precede the draw | Consumed when a **result is recorded**, which is when they were actually spent |
| Nothing stopped the till selling a test the bench had no reagent for | `check_stock_available` asks `LabTestPanel.can_run()` and refuses the line |
| Two panels could share one billing item, so pricing one repriced the other | `LabTestPanel.item` is one-to-one; `laboratory/migrations/0027` split any that shared |
| `Inventory` table held a quantity column | `StockMovement` ledger, with `StockBalance` as a derived cache |
| `TestKitCounter` tracked available tests | Availability computed from the ledger; no counter table |
| Counter decremented when a test ran | `CONSUMPTION` movement posted when a result is recorded, idempotently |
| Threshold on the counter row | Re-order level on `StockPolicy`, per item per department |
| `Inventory.sale_price` | `ItemPrice`, effective-dated; each invoice line also freezes its own `unit_price` when billed, which is what actually keeps an old invoice at its old price |
| Reagents stocked in **kits** | Stocked in **tests**; `Kit` is a pack size of N tests |
| `ensure_service_inventory` created fake stock rows so billing could find a price | `ensure_service_prices` sets a price; service items hold no stock at all |
| No concept of collection consumables | `SpecimenConsumable`, deducted once per sample collected |
| Everything an item needed lived on the item (`inventory.ItemConsumable`), lab tests included | Split apart again: reagents on the **Test Panel**, collection items on the **Specimen**, and `ItemConsumable` kept for the pharmacy case it was always right for. Lab rows were moved back onto their specimens in `laboratory/migrations/0026`. |
| Collection consumables were deducted **at billing**, against the test | Deducted **at collection**, against the sample. One draw costs one syringe however many tests are ordered off it, and a re-test costs none. |
| A lab test item carried its sale price in Inventory | The **Test Panel** carries it. Reagents and lab consumables are unpriced (`Item.is_sellable` is false) and the API refuses a price for them. |
| Nothing recorded what a particular draw used | `PatientSampleConsumable`, written at collection and shown back on the collection screen |
| Nobody could say what a test cost to deliver | `/reports/gross-margin/` traces every outflow back to the sale, run or draw that caused it |

The old "Total Demo Value / Potential Profit" summary has been dropped rather
than corrected. It was arithmetic over a reagent list that has since changed,
it ignored the cost of the reagent it was selling, and nothing in the codebase
produced or checked those figures.

**See also:** `INVENTORY_FLOW.md` for the end-to-end purchasing flow, and
`INVENTORY_UNITS_OF_MEASURE.md` for how units and pack sizes work.
