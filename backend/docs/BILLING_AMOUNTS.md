# What the numbers on an invoice line mean

Four money fields sit on `billing.InvoiceItem`, plus three recording what has
since come off the line. The first four used to be written by three different
pieces of code using two different conventions, so this is the reference for
which is which.

---

## The four fields

| Field | Meaning |
| --- | --- |
| `unit_price` | What **one base unit** was charged at, frozen when the line was billed |
| `item_amount` | The **whole line**, whoever ends up paying: `unit_price x quantity` |
| `patient_amount` | The **patient's own share** still standing: the co-pay, or all of it on a cash line, less discounts and credits |
| `actual_total` | Receivable from the party the line is **billed to** — the insurer on an insurance line, the patient on any other — less what has come off it |
| `discount` | Given on this line at the till |
| `invoice_discount` | This line's share of a discount given on the invoice's total |
| `credited_amount` | Taken off by credit notes, patient and payer portions together |

Two invariants hold on every line:

```
item_amount     == unit_price x quantity
net_amount      == item_amount - discount - invoice_discount - credited_amount   # property
patient_amount  +  insurer_amount  ==  net_amount                                # insurer_amount is a property
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

### A zero-value line

An item with no price bills at zero. Panels that are never sold alone have no
price of their own: the money sits on their profile, whose billing item adds one
line each time the profile is requested. Each panel still gets its own zero
line, because billing that line is what releases it to Phlebotomy. A profile's
price is added to any price its panels have, so leave those panels at 0.

Nothing will ever be paid against an invoice of only zero lines, so it closes
itself once they are all billed (`billing.adjustments.settle_if_nothing_owed`).

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
| `invoice_amount` | `Sum(actual_total)` — receivable from all billed parties together, after discounts and credits |
| `total_cash` | `Sum(actual_total)` over cash-mode lines |
| `patient_due` *(property)* | `Sum(patient_amount)` — everything the patient owes, co-pays included |
| `gross_total` *(property)* | `Sum(item_amount)` — what the invoice was worth before anything came off it |

`invoice_amount` deliberately excludes a co-pay on an insurance line, because
that money is owed by the patient and not by the party the line was billed to.
`patient_due` is the figure to show a patient at the till.

### Who reads which number

| Reader | Reads |
| --- | --- |
| Payment allocation (`AllocatePaymentView`) | An insurer pays against `actual_total`; a patient pays against `patient_amount` |
| Insurance receivables (`billing/views.py`) | `actual_total` on that insurer's lines |
| Invoice PDF | `item_amount` per line; its balance is the net total less everything allocated |
| Gross margin report (`reports/margins.py`) | `net_amount` as revenue, split by `patient_amount` |

---

## One writer

`InvoiceItem.get_pricing_for_item()` decides the price of a line and
`InvoiceItem.save()` applies it. After that, only `billing/adjustments.py` and a
changed `discount` move the money. Nothing else writes it:

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

### Correcting a billed line

Issue a credit note (below). The quantity on a billed line still can't be
changed: credit the line and raise a new one.

---

## Discounts

Admin only, at `InvoiceItemSerializer.discount` and
`POST /billing/invoices/<id>/discount/`. Discounts come off the **patient's
share only**. A price agreed with an insurer or an employer is not the
facility's to cut, so a line billed wholly to credit has nothing to discount.

A discount on the total is spread over the billed lines in proportion to what
the patient still owes on each, so the payment allocator needs no special case.
Posting a new amount replaces the old one, and 0 takes it off. Neither kind can
take a line below what has already been paid on it: that calls for a credit note.

The till's summary reads `Cash - Discount + Credit = Total`.

## Credit notes

Admin only to issue, `POST /billing/credit-notes/`, and never edited afterwards.
A note covers a whole invoice or named lines, each in full or for part of its
value. On an insured line a part credit splits between the co-pay and the payer
in proportion.

- The value comes off `patient_amount` and `actual_total`, so balances, statements
  and margins all follow. A statement shows the reduced figure on the line's
  original date, not a separate entry on the note's date.
- A line credited **in full** has its stock put back as ledger reversals, unless
  `restock` is false. Reagents and draw kits a test has used stay used, and a
  test not yet run comes back off the Phlebotomy list.
- `refund_due` records value credited that had already been paid. **Paying that
  back is not modelled yet**: no money leaves a cash account, so account balances
  still include it until it is handled outside the system.
- Credit notes are **not sent to KRA**. eTIMS receives the sale net of discounts
  when an invoice settles, but a reversal of a sale already signed is a separate
  submission that has not been built.

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
