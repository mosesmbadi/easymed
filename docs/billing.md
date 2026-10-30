# billing — invoices, payments and accounts

`backend/billing/` · mounted at `/billing/`

Turns clinical orders into money. Every visit has an `Invoice`; every billable
order (test, drug, consultation) is an `InvoiceItem`. Billing a line prices it
once, issues the stock it consumes, and makes it receivable. Payments are
recorded as receipts and allocated to lines.

For exactly what each money field means, read
[backend/docs/BILLING_AMOUNTS.md](../backend/docs/BILLING_AMOUNTS.md).

## Models

### `PaymentMode`

How a line is paid: `payment_mode` (label), `payment_category`
(`cash`, `insurance`, `mobile_money`, `bank_transfer`, `direct_to_bank`),
`insurance` (FK, for insurance modes), `is_default`.

- Only one mode can be `is_default`; saving one clears the others.
- `PaymentMode.get_default()` → flagged default, else first cash mode. A cash mode
  is seeded by migration.
- Insurance modes are created automatically with each `InsuranceCompany`.

### `Invoice`

| Field | Notes |
| --- | --- |
| `patient`, `invoice_number`, `invoice_date`, `status` (`pending/paid`) | Visit invoices take the visit's `track_number` as number; others get `DDLI#####-YYYY` (yearly sequence) |
| `invoice_amount` | Sum of lines' `actual_total` (receivable from the billed party) |
| `total_cash` | Sum of `actual_total` on cash-category lines |
| `cash_paid` | Running total of payments received |
| `invoice_description`, `invoice_file` | |

Properties: `patient_due` (sum of `patient_amount` — cash lines + co-pays) and
`gross_total` (sum of `item_amount`). Totals are recalculated on every save.

### `InvoiceItem`

| Field | Meaning |
| --- | --- |
| `invoice`, `item`, `quantity` | What is sold |
| `payment_mode` | Defaults to `PaymentMode.get_default()` |
| `status` | `pending` → `billed` |
| `unit_price` | One base unit's price, frozen at billing |
| `item_amount` | `unit_price × quantity` — the whole line |
| `patient_amount` | Patient's share (co-pay, or everything on cash) |
| `actual_total` | Receivable from the billed party |
| `source_tag` | `inventory.Department` the line is dispensed from / credited to |

**Pricing** (`get_pricing_for_item`):

- Cash: `unit_price = item.current_sale_price`; all four amounts equal the line total.
- Insurance with an `InsuranceItemSalePrice`: `unit_price = sale_price + co_pay`,
  `patient_amount = co_pay × qty`, `actual_total = sale_price × qty`.
- Insurance with no insurer price: cash price, charged to the patient,
  `price_source = 'cash_fallback'`.

**Freezing.** `save()` reprices the line on every save *until and including* the
save that flips it to `billed`. After that the amounts never change, and
changing `quantity` on a billed line raises a `ValidationError` — reverse it and
raise a new line instead.

Helper properties: `sale_price`, `insurer_amount`, `is_priced`, `price_source`.

### Payments

| Model | Purpose |
| --- | --- |
| `InvoicePayment` | Simple payment against an invoice; on create adds to `invoice.cash_paid` |
| `PaymentReceipt` | One payment event from a patient or insurer: `total_amount`, `reference_number`, `payment_date`, `payment_mode`, `sub_account` |
| `PaymentAllocation` | Part of a receipt applied to one `InvoiceItem` (`amount_applied`) |

### Accounts

| Model | Purpose |
| --- | --- |
| `MainAccount` | Top-level liquidity account (Cash, Bank, Mobile Money...). `total_balance` sums sub-accounts |
| `SubAccount` | Belongs to a main account, linked to a `PaymentMode`. `balance = opening_bal + receipts − supplier payments`. Also `min/max_bal`, `min/max_trans`, `active` |

Supplier payments (`inventory.SupplierPaymentReceipt`) draw down sub-accounts, so
the finance module sees receivables and payables in one place.

## Billing and stock

The rules live in `services.py` and are wired by `signals.py`.

1. **`pre_save InvoiceItem`** — if this save flips the line to `billed`, run
   `check_stock_available()`. It refuses the save when:
   - the item is stock-tracked and the dispensing location lacks the quantity;
   - the item is a Lab Test whose panel's reagents are not in Lab stock
     (`LabTestPanel.can_run`);
   - a required accompaniment (e.g. syringe for an injection) is short.
2. **`post_save InvoiceItem`** — once committed, `post_stock_for_invoice_item()`
   issues the stock (FEFO) and consumes accompaniments. Idempotent per invoice
   item, so a re-save cannot dispense twice.
3. **`post_save`/`post_delete InvoiceItem`** — recompute the invoice totals.
4. **`post_save InvoiceItem`** for `Drug`/`Lab Test` items — mark the matching
   `PrescribedDrug` / `LabTestRequestPanel` `is_billed` (`utils.update_service_billed_status`).

Dispensing location (`dispensing_department`): `source_tag` if set, else by
category — `Drug` → Pharmacy, `LabReagent`/`LabConsumable` → Lab — else the
default department.

`reverse_stock_for_invoice_item()` posts contra movements when a billed line is
reversed.

## Payment allocation

`POST /billing/allocate-payment/` (`AllocatePaymentView`):

```json
{
  "patient_id": 12,          // or "insurance_id"
  "invoice_ids": [40, 41],
  "sub_account": 3,          // must have a linked payment mode
  "amount": "2500.00",
  "reference_number": "MPESA-XYZ",
  "payment_date": "2026-10-30"
}
```

Creates one `PaymentReceipt` and applies the amount to the selected invoices'
lines, oldest first (`item_created_at`). For a patient payment the outstanding
amount per line is its `patient_amount`; for an insurer it is `actual_total` on
that insurer's lines; prior allocations by the same payer are subtracted.
Patient payments also bump `cash_paid`; if nothing on the lines is allocatable,
a patient payment falls back to the invoice's `total_cash − cash_paid`. Invoice
`status` is then recomputed from total allocations.

## Endpoints (`/billing/...`)

Router resources:

| Path | ViewSet | Access |
| --- | --- | --- |
| `invoices/` | `InvoiceViewset` | doctor, nurse, labtech or receptionist |
| `invoice-items/` | `InvoiceItemViewset` | same; `PATCH` is how a line is billed |
| `payment-modes/` | `PaymentModeViewset` | default |
| `payment-receipts/` | `PaymentReceiptViewset` (read-only) | default |
| `invoice-payments/` | `InvoicePaymentViewset` | default |
| `main-accounts/`, `sub-accounts/` | account CRUD | default |

Other paths:

| Path | Purpose |
| --- | --- |
| `GET invoices/patient/<patient_id>/` | A patient's invoices |
| `GET invoices/insurance/<insurance_id>/` | Invoices with lines on an insurer |
| `GET invoices/items/<invoice_id>/` | Lines of one invoice |
| `GET invoice-items-by-insurance-company/` | Lines filtered by insurer |
| `GET payment-modes-breakdown/` | Totals per payment mode |
| `POST allocate-payment/` | See above |
| `GET accounting-summary/?start_date=&end_date=` | Received (allocations) vs paid out (supplier allocations), grouped by account |
| `GET accounting-summary/pdf/` | Same, as PDF |
| `GET download_invoice_pdf/<invoice_id>/` | Invoice PDF |
| `GET download_payment_receipt_pdf/<receipt_id>/` | Receipt PDF |

Templates in `billing/templates/`; `templatetags/money.py` formats amounts using
the `EASYMED_CURRENCY_*` settings.

## Tests

`billing/tests/test_invoice_pricing.py`, `billing/tests/test_cash_payment_mode.py`.

## Known issues

- `update_invoice_cash_paid` adds to `cash_paid` on create but nothing subtracts
  on update/delete, so editing or deleting an `InvoicePayment` leaves
  `cash_paid` wrong.
- `Invoice.__str__` dereferences `self.patient.first_name`; it raises when the
  patient was deleted (`SET_NULL`).
- `PaymentModeViewset`, account viewsets and `InvoicePaymentViewset` use only
  the default `IsAuthenticated` — any signed-in user, including a `patient`
  role, can create payment modes or payments.
- `AccountingSummaryView` excludes pharmacists and sysadmins (non-superuser).
- `AllocatePaymentView` resolves the sub-account's payment mode but never stores
  it on the `PaymentReceipt` (`payment_mode` stays null), and does the
  allocation arithmetic in `float` rather than `Decimal`.
