# reports — sales, payment-mode totals and gross margin

`backend/reports/` · mounted at `/reports/` (some views also at the root)

No models. Read-only reporting over billing and the stock ledger.

## Endpoints

| Method & path | View | Purpose |
| --- | --- | --- |
| `POST /reports/sale_by_date/` (also `/sale_by_date/`) | `get_invoice_items_by_date_range` | Body `{"start_date","end_date"}` (YYYY-MM-DD). Writes `easymed/static/reports/invoice_items.pdf` from `templates/sales_by_date.html` |
| `GET /sale_by_date/pdf/` | `serve_generated_pdf` | Serves that last generated file |
| `POST /reports/sale_by_item_and_date/` | `get_invoice_items_by_item_and_date_range` | Body adds `item_id`. Writes `sales_by_item_id.pdf` |
| `GET /serve_sales_by_item_id_pdf/` | `serve_sales_by_item_id_pdf` | Serves that last generated file |
| `GET /reports/total_payment_mode_amount/?payment_mode=<category>&date=<YYYY-MM-DD>` | `PaymentReportView` | Lines for that payment category on that day, with a total |
| `GET /reports/gross-margin/?start_date=&end_date=&category=` | `GrossMarginView` | Revenue, cost and margin per item (dates default to today) |

## Gross margin (`margins.py`)

Revenue comes from **billed** invoice lines at the price frozen on the line.
Cost comes from the stock ledger: every outflow carries the `unit_cost` it left
at, and is traced back to what caused it:

| Ledger source | Traced to |
| --- | --- |
| `INVOICE_ITEM` | the invoice line (dispensed drug, accompaniments) |
| `LAB_TEST` | the `LabTestRequestPanel` (reagents) |
| `SAMPLE_COLLECTION` | the `PatientSample` (syringe, tube, gloves) |

A sample's collection cost is **split evenly** across the panels run off it — a
convention, kept separate from measured costs in the output.

Functions: `direct_costs_by_invoice_item`, `reagent_costs_by_panel_run`,
`collection_costs_by_sample`, `lab_costs_by_item`, `margin_by_item`,
`margin_totals`, `stock_consumption_summary`.

Response shape:

```
{
  "start_date", "end_date",
  "totals": { revenue, patient_revenue, insurer_revenue, cost, margin,
              margin_percent, items, items_without_cost, revenue_without_cost, ... },
  "rows": [ { item_id, item_name, item_code, category, quantity,
              revenue, patient_revenue, insurer_revenue,
              direct_cost, reagent_cost, collection_cost,
              cost, margin, margin_percent, cost_expected, cost_known } ],
  "consumption": { ... }   // stock_consumption_summary()
}
```

`cost_expected` is false for categories that never carry stock (services with
no reagents); `items_without_cost` / `revenue_without_cost` show how much of the
total margin is unverified.

## Known issues

- The sales PDF views are plain Django functions with `@csrf_exempt` and **no
  authentication**; the `serve_*` views likewise. Anyone who can reach the
  backend can generate and download sales reports.
- Generated PDFs are written to one fixed filename, so concurrent users
  overwrite each other's report.
- The date-range filter uses midnight-to-midnight datetimes, so the end date's
  own sales are excluded.
- `PaymentReportView` sums `invoice.invoice_amount` once **per line**, so an
  invoice with several matching lines is counted several times.
