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

`payments.allocate_payment()` does the work. `POST /billing/allocate-payment/`
(`AllocatePaymentView`) and the M-Pesa callback both call it, so money is
booked the same way whether the cashier keys it in or Safaricom confirms it.
The request body:

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

## Credit accounts and statements

Insurers, employers and referring clinics are all `company.InsuranceCompany`
credit accounts (see [company.md](company.md#insurancecompany-credit-accounts)).

**Unagreed prices.** For an item the account has no agreed price for:
- a **corporate or facility** account pays the price list
  (`price_source='account_list_price'`);
- an **insurer** doesn't, and the line falls back to the patient
  (`cash_fallback`).

**Billing on account.** Lab walk-ins and referred samples billed to a corporate
or facility account are created `billed`. They skip the till and go straight
onto the Phlebotomy list.

`statements.account_statement(account, start, end)` builds a statement:
- balance brought forward;
- billed lines in the period, each counted on the day it was raised;
- receipts against the account, each counted on its payment date;
- the amount due.

`GET accounts/<id>/statement/?start=&end=` returns it as JSON (the current month
by default), and as PDF with `&download=pdf`.

## eTIMS (`etims.py`, `integrations/etims.py`)

When an invoice is settled in full (`status='paid'`), a `post_save` signal
queues an `EtimsSubmission`, but only when eTIMS is configured. Sending it is a
Celery task:
- **Accepted:** the KRA receipt number, signature and verification link are
  stored, and the invoice PDF prints them with the facility's KRA PIN.
- **Failed:** the submission records the error and retries with backoff. The
  payment itself is never held up or undone.
- **Resending:** the `resend-unsent-etims` beat job retries hourly, the
  `manage.py send_etims [--backfill]` command sends now, and Django admin has a
  "Send to eTIMS now" action.

The payload follows KRA's OSCU `trnsSales/saveSales` format. Every line uses tax
type A (exempt) and KRA's catch-all item classification code. **Each item needs
its own registered codes before going live.**

Settings: `ETIMS_ENABLED`, `ETIMS_BASE_URL`, `ETIMS_CMC_KEY`, `ETIMS_BRANCH_ID`,
`ETIMS_DEVICE_SERIAL`, and `ETIMS_PIN` (falls back to `Company.kra_pin`).

## M-Pesa (`mpesa.py`, `integrations/mpesa.py`)

`POST mpesa/stk-push/ {invoice_id, phone[, amount]}` prompts the customer's
phone through Daraja, for what they owe on the invoice by default, and records
an `MpesaPaymentRequest`.

Safaricom then calls `POST mpesa/callback/<MPESA_CALLBACK_TOKEN>/`:
- The call is **unauthenticated**; the token in the URL is the trust.
- A **paid** callback books the money with `allocate_payment` into the M-Pesa
  sub-account: `MPESA_SUB_ACCOUNT_ID`, or else the first sub-account whose
  payment mode is `mobile_money`.
- It is **idempotent**, so a repeated callback books nothing twice.
- **Result code 1032** means the customer cancelled.

`GET mpesa/stk-push/<id>/` lets the screen poll.

When M-Pesa isn't configured the push answers `503 {configured: false}`, and
`GET integrations/` reports `{mpesa, etims}` so screens offer only what's on.
The cashier then takes M-Pesa as before, by typing the code in.

Settings: `MPESA_ENABLED`, `MPESA_ENVIRONMENT` (`sandbox` or `production`),
`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`,
`MPESA_PASSKEY`, `MPESA_TRANSACTION_TYPE`, `MPESA_CALLBACK_URL` (this backend's
public address), `MPESA_CALLBACK_TOKEN`, and `MPESA_SUB_ACCOUNT_ID`.

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
| `GET accounts/<id>/statement/` | A credit account's statement; `?download=pdf` for the PDF |
| `GET integrations/` | Which outside services are on: `{mpesa, etims}` |
| `POST mpesa/stk-push/`, `GET mpesa/stk-push/<id>/` | Prompt a phone for payment; poll it |
| `POST mpesa/callback/<token>/` | Safaricom's confirmation (unauthenticated) |

Templates in `billing/templates/`; `templatetags/money.py` formats amounts using
the `EASYMED_CURRENCY_*` settings.

## Tests

`billing/tests/test_invoice_pricing.py`, `billing/tests/test_cash_payment_mode.py`,
`billing/tests/test_credit_accounts.py`, `billing/tests/test_integrations.py`.
The integration tests stand in for KRA and Safaricom; none of them goes out to
the internet.

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
