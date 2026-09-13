# What the numbers on an invoice line mean

Four money fields sit on `billing.InvoiceItem`. They used to be written by three
different pieces of code using two different conventions, so this is the
reference for which is which.

---

## The four fields

| Field | Meaning |
| --- | --- |
| `unit_price` | What **one base unit** was charged at, frozen when the line was billed |
| `item_amount` | The **whole line**, whoever ends up paying: `unit_price x quantity` |
| `patient_amount` | The **patient's own share**: the co-pay, or all of it on a cash line |
| `actual_total` | Receivable from the party the line is **billed to** — the insurer on an insurance line, the patient on any other |

Two invariants hold on every line:

```
item_amount     == unit_price x quantity
patient_amount  +  insurer_amount  ==  item_amount      # insurer_amount is a property
```

### Cash line, 3 tablets at 100

| | |
| --- | --- |
| `unit_price` | 100 |
| `item_amount` | 300 |
| `patient_amount` | 300 |
| `actual_total` | 300 |

### Insurance line, 2 units, insurer pays 80 and the patient co-pays 20

| | |
| --- | --- |
| `unit_price` | 100 &nbsp;*(80 + 20 — an insurance price is a split, not a discount)* |
| `item_amount` | 200 |
| `patient_amount` | 40 |
| `actual_total` | 160 |

### Insurance selected, but no price configured for that item

Billed at the cash price and charged to the **patient**. Nothing is claimed from
an insurer who never agreed a rate: `price_source` reads `cash_fallback` so the
fallback is visible rather than silent.

### A lab test line

Priced like any other line, from the billing item behind the Test Panel — the
panel's Sale Price is stored there. It is the only service line that can be
refused at billing: if the panel's reagents are not in Lab stock, the line is
rejected naming the reagent. See `LAB_REAGENTS_SETUP.md`.

---

## An insurance price is a split

`InsuranceItemSalePrice` holds two numbers for one item:

- `sale_price` — the insurer's portion
- `co_pay` — the patient's portion

The line is worth **both added together**. Treating `sale_price` as the whole
price and then subtracting the co-pay from it is what the old code did, and it
under-billed every insurer by exactly the amount the patient had already paid.

---

## Where they roll up to

| On `Invoice` | Is |
| --- | --- |
| `invoice_amount` | `Sum(actual_total)` — receivable from all billed parties together |
| `total_cash` | `Sum(actual_total)` over cash-mode lines |
| `patient_due` *(property)* | `Sum(patient_amount)` — everything the patient owes, co-pays included |
| `gross_total` *(property)* | `Sum(item_amount)` — what the invoice is worth in total |

`invoice_amount` deliberately excludes a co-pay on an insurance line, because
that money is owed by the patient and not by the party the line was billed to.
`patient_due` is the figure to show a patient at the till.

### Who reads which number

| Reader | Reads |
| --- | --- |
| Payment allocation (`AllocatePaymentView`) | An insurer pays against `actual_total`; a patient pays against `patient_amount` |
| Insurance receivables (`billing/views.py`) | `actual_total` on that insurer's lines |
| Invoice PDF | `item_amount` per line, quantity included |
| Gross margin report (`reports/margins.py`) | `item_amount` as revenue, split by `patient_amount` |

> **Known gap:** the invoice PDF still computes `balance = invoice_amount -
> cash_paid`. On an invoice with insurance lines that is not what the patient
> owes: it counts the insurer's share and leaves out the co-pay. `patient_due`
> is the right figure; the PDF has not been switched to it.

---

## One writer

`InvoiceItem.get_pricing_for_item()` decides all four numbers.
`InvoiceItem.save()` is the only thing that applies them. Nothing else writes
money:

- the **API refuses** them — all four are `read_only` on `InvoiceItemSerializer`,
  so a client cannot post its own totals;
- the **till stops sending** them — the billing screen posts a payment mode and
  a status, and reads the amounts back off the response;
- the **old pre_save is gone** — `calculate_actual_total` used to fire *after*
  `save()` had already set the field and overwrite it with the opposite
  convention.

## Priced once

A line follows the price list right up to and including the save that bills it
-- that save is the sale, so the price then is the price charged. Every save
after that leaves the money alone, and the quantity is refused outright.

This is the point of the effective-dated `ItemPrice` list, and it had been
defeated: `save()` re-read `current_sale_price` — meaning *today's* price — on
every save, so an invoice raised last month silently restated itself the next
time a signal, a status change or a stock posting touched the row. `unit_price`
holds what it was actually sold at, and `InvoiceItem.sale_price` quotes that
rather than the live list.

### Correcting a billed line — not possible yet

There is **no reversal flow for an invoice line** today. The intended route —
reverse the line, then raise a corrected one — is only partly built:

- `billing.services.reverse_stock_for_invoice_item` would put back the stock a
  line took out, but **nothing calls it**. It also only covers `INVOICE_ITEM`
  movements, so a lab test's reagents (`LAB_TEST`) and its sample's collection
  items (`SAMPLE_COLLECTION`) would not come back through it.
- A single stock movement can be reversed with
  `POST /inventory/stock-movements/<id>/reverse/` and a reason. No screen
  offers this, and it does not touch the invoice line.
- The line itself cannot be voided, and its quantity cannot be changed once it
  is billed. Quantity is a positive number, so a negative correcting line
  cannot be raised either.

Until that exists there is no in-system way to credit a patient for a wrongly
billed line. The stock side can be put right movement by movement.

---

## Migrating

`billing/migrations/0015_invoiceitem_price_snapshot_and_payer_split` adds the two
new columns and **rebuilds the amounts on every existing line** to this
convention.

Existing rows are rewritten rather than left alone on purpose. The payment
allocator and the insurance receivables screen both read `actual_total`, so a
database holding both conventions reports balances that are right for some
invoices and wrong for others with nothing to tell them apart. Historic lines
are re-derived from the insurance price row where there is one, and otherwise
from the amount already stored — never from today's cash price list, which would
be inventing a figure.

**See also:** `LAB_REAGENTS_SETUP.md` for what the lab consumes and when, and
`INVENTORY_FLOW.md` for where the stock behind a sale comes from, and for the
gross margin report that sets one against the other.
