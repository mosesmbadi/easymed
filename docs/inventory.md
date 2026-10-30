# inventory — catalogue, stock ledger and procurement

`backend/inventory/` · mounted at `/inventory/`

The largest module. It covers three things:

1. **Catalogue** — every billable or stockable thing is an `Item`, with units,
   prices and accompaniments.
2. **Stock** — an append-only ledger (`StockMovement`) with a derived balance
   cache (`StockBalance`), lots with expiry, reservations, transfers and stock takes.
3. **Procurement and payables** — requisition → purchase order → goods receipt →
   supplier invoice → supplier payment.

Step-by-step walkthroughs live in
[backend/docs/INVENTORY_FLOW.md](../backend/docs/INVENTORY_FLOW.md) and
[backend/docs/INVENTORY_UNITS_OF_MEASURE.md](../backend/docs/INVENTORY_UNITS_OF_MEASURE.md).

## Catalogue

### `Item`

An Item carries **no stock and no price of its own**: stock lives in the ledger,
prices in `ItemPrice` / `InsuranceItemSalePrice`.

| Field | Notes |
| --- | --- |
| `item_code`, `name`, `desc` | |
| `category` | `SurgicalEquipment`, `LabReagent`, `LabConsumable`, `Drug`, `Furniture`, `Lab Test`, `General Appointment`, `Specialized Appointment`, `general` |
| `category_one` | `Resale` or `Internal` (consumable) |
| `units` | FK → `Unit`, the **base unit** stock is counted in |
| `vat_rate`, `slow_moving_period` (days), `default_re_order_level` | |
| `is_stock_tracked` | Services are never tracked |
| `departments` | Through `ItemDepartment` (`is_primary`) |

Category groups that drive behaviour:

| Set | Members | Effect |
| --- | --- | --- |
| `SERVICE_CATEGORIES` | Lab Test, General/Specialized Appointment | Billable, never stock-tracked |
| `UNPRICED_CATEGORIES` | LabReagent, LabConsumable | No sale price (`is_sellable` false); the lab sells the panel instead |
| `LAB_CATEGORIES` | Lab Test, LabReagent, LabConsumable | No item-level accompaniments; the lab declares them on specimen/panel |

Useful properties: `current_sale_price`, `current_cost`, `last_purchase_cost`,
`quantity_at_hand`, `is_sellable`, `supports_accompaniments`,
`is_available_to(department)`.

### Supporting catalogue models

| Model | Purpose |
| --- | --- |
| `Unit` | Base units (`symbol`, `name`, `category`) |
| `ItemUnit` | Pack sizes: `name` (Box, Strip), `factor_to_base`, `is_purchase_default`, `is_sale_default` |
| `ItemPrice` | Effective-dated cash price: `sale_price`, `effective_from`, `effective_to`. Set via `stock.set_sale_price()` |
| `InsuranceItemSalePrice` | Per-insurer price split: `sale_price` (insurer part) + `co_pay` (patient part) |
| `ItemConsumable` | Accompaniment: `item` needs `quantity_per_use` × `consumable`; `is_required` blocks billing when short |
| `ItemDepartment` | Which departments use/stock an item |
| `Department` | `name`, `is_stock_location`, `head` (user). Stock is held per department |
| `Supplier` | `official_name`, `common_name`, contact |

## Stock ledger

`inventory/services/stock.py` is **the only writer of stock**. Nothing else may
create `StockMovement` or update `StockBalance`.

Conventions:

- Quantities are stored in **base units**. Callers may pass an `ItemUnit`; it is
  converted once before writing.
- Movement quantities are **signed**: positive in, negative out.
- Issues allocate **FEFO** (first expiry, first out) and skip expired lots unless told otherwise.
- Costing is **weighted average per lot per location**; each movement stores the
  `unit_cost` applied, so cost of goods sold is a sum over the ledger.

### Models

| Model | Purpose |
| --- | --- |
| `StockLot` | `item`, `lot_number`, `expiry_date`, `supplier` |
| `StockMovement` | The ledger. Append-only; corrections are contra entries. Fields include `movement_type`, `item`, `lot`, `department`, signed `quantity`, `unit_cost`, `balance_after`, `occurred_at`, `performed_by`, `reason`, `source_type`/`source_id`, `reference` (groups legs of one transaction), `reverses`, `idempotency_key` (unique) |
| `StockBalance` | Cache of on-hand per `(item, lot, department)`, with weighted `unit_cost` and last movement/receipt/issue timestamps |
| `StockPolicy` | Per item+department `re_order_level`, `reorder_quantity`, `max_level` |
| `StockReservation` | Soft hold between promise and issue. Status `ACTIVE/CONSUMED/RELEASED/EXPIRED`, `expires_at`, source |
| `StockTake` / `StockTakeLine` | Physical count; posting writes `ADJUSTMENT` movements for variances |

Movement types: `OPENING_BALANCE`, `RECEIPT`, `TRANSFER_IN`, `RETURN_FROM_ISSUE`
(in); `SALE`, `CONSUMPTION`, `TRANSFER_OUT`, `WASTAGE`, `EXPIRY_WRITE_OFF`,
`RETURN_TO_SUPPLIER` (out); `ADJUSTMENT`, `REVERSAL` (either way).

Sources: `MANUAL`, `GOODS_RECEIPT`, `INVOICE_ITEM`, `LAB_TEST`,
`SAMPLE_COLLECTION`, `STOCK_TAKE`, `TRANSFER`, `SYSTEM`.

**Available stock = on hand − active reservations** (expired lots excluded).

### Service API (`services/stock.py`)

| Function | Does |
| --- | --- |
| `receive(...)`, `receive_incoming_item(incoming_item)` | Post a `RECEIPT` |
| `issue(item, department, quantity, ...)` | FEFO issue across lots; raises `InsufficientStock` |
| `transfer(...)` | Paired `TRANSFER_OUT`/`TRANSFER_IN` |
| `adjust(...)` | Manual adjustment |
| `reverse(movement, reason)` | Contra entry |
| `write_off_expired(as_of)` | `EXPIRY_WRITE_OFF` for expired lots |
| `reserve`, `release_reservation`, `consume_reservation`, `expire_stale_reservations` | Reservations |
| `post_stock_take(stock_take)` | Variance adjustments |
| `on_hand_quantity`, `available_quantity`, `reserved_quantity` | Queries |
| `items_below_reorder_level`, `stock_as_of`, `stock_card`, `stock_valuation`, `cost_of_goods_sold`, `slow_moving_balances` | Reporting |
| `default_department()` | Fallback stock location |
| `rebuild_balances(dry_run)` | Rebuild `StockBalance` from the ledger |
| `set_sale_price(item, price, effective_from)` | Close the current `ItemPrice` and open a new one |

Errors: `StockError`, `InsufficientStock`, `NotStockTracked`.

### Accompaniments (`services/consumables.py`)

`requirements()`, `availability()`, `shortfalls()`, `check_available()`,
`consume()` — what an item drags along (syringe + swab for an injection), whether
it is covered, and taking it out of stock. Lab items are excluded; the lab
declares its own (see [laboratory.md](laboratory.md#reagents-and-consumables)).

### Who moves stock

| Trigger | Movement |
| --- | --- |
| Goods receipt / incoming item | `RECEIPT` |
| Invoice line billed ([billing](billing.md#billing-and-stock)) | `SALE` + accompaniment `CONSUMPTION` |
| Drug prescribed ([patient](patient.md)) | reservation only |
| Lab result entered | reagent `CONSUMPTION` (`LAB_TEST`) |
| Sample collected | collection consumables (`SAMPLE_COLLECTION`) |
| Nightly task | `EXPIRY_WRITE_OFF` |
| Stock take posted | `ADJUSTMENT` |

## Procurement

```
Requisition ──approve (dept)──► approve (procurement) ──► PurchaseOrder
     │                                                         │
     └─ RequisitionItem (qty requested/approved, preferred supplier, unit)
                                                               ▼
                         GoodsReceiptNote + IncomingItem lines + SupplierInvoice
                                                               ▼
                                         stock RECEIPT  ──►  SupplierPaymentReceipt
                                                              └ SupplierPaymentAllocation
```

| Model | Notes |
| --- | --- |
| `Requisition` | `requisition_number`, `department`, `requested_by`, `approved_by`. Status `PENDING → DEPARTMENT_APPROVED → PROCUREMENT_APPROVED → PARTIALLY_ORDERED/ORDERED`, or closed as `REJECTED`/`CANCELLED` (`closed_reason`, `closed_by`). Status follows its lines via a signal |
| `RequisitionItem` | `quantity_requested`, `quantity_approved`, `ordered`, `preferred_supplier`, `item_unit`, `unit_cost` |
| `PurchaseOrder` | `PO_number`, `supplier`, `requisition`, `status`, `is_dispatched`, `ordered_by`, `approved_by` |
| `PurchaseOrderItem` | `quantity_ordered`, `quantity_received`, link to requisition item |
| `GoodsReceiptNote` | `grn_number` `YYYYMMDD-GRN-XXXXXX` |
| `IncomingItem` | A received line: item, unit, quantity, `purchase_price`, `sale_price`, `lot_no`, `expiry_date`, `department`, supplier, PO, supplier invoice, GRN, `posted_at` |
| `SupplierInvoice` | `invoice_no`, `amount`, `status`, `supplier`, `purchase_order` |
| `SupplierPaymentReceipt` / `SupplierPaymentAllocation` | Payments to suppliers from a billing `SubAccount`, allocated to supplier invoices |
| `Quotation`, `QuotationItem`, `QuotationCustomer` | Price quotations for customers |

## Permissions

`permissions.CanManageInventory` guards `IncomingItemViewSet`,
`StockBalanceViewSet` (create), `GoodsReceiptView`, `StockAdjustmentView`,
`StockTransferView`, `StockTakeViewSet` and `ItemConsumableViewSet`. Reads are
open to any signed-in user. A write is allowed for:

- superusers and `sysadmin` role;
- users with `CustomUser.can_manage_inventory = True`;
- the **head** of the department(s) named in the payload
  (`department`, `to_department`, or `department` on each line).

## Endpoints (`/inventory/...`)

Router resources:

| Path | Purpose |
| --- | --- |
| `items/` | Catalogue. Extra: `GET items/<id>/consumables/`, `stock/`, `stock-card/`; `GET items/export_excel/`; `POST items/import_excel/` |
| `item-units/`, `item-prices/`, `item-consumables/`, `units/` | Catalogue support |
| `insurance-item-prices/` | Insurer prices |
| `departments/`, `suppliers/` | |
| `stock-balances/` (alias `inventories/`) | On-hand. Extra: `summary/`, `valuation/`, `slow-moving-items/`, `reorder-levels/` |
| `stock-lots/`, `stock-movements/` | Read-only. `POST stock-movements/<id>/reverse/` |
| `stock-policies/`, `stock-reservations/` | |
| `stock-takes/`, `stock-take-lines/` | `POST stock-takes/<id>/populate/`, `POST stock-takes/<id>/post/` |
| `requisition/` | `POST <id>/reject/`, `cancel/`, `reopen/` (body `{"reason": ...}`) |
| `requisitionitems/`, `requisition/<id>/requisitionitems/` | |
| `purchase-orders/`, `requisition/<id>/purchase-orders/`, `purchase-orders/<id>/purchaseorderitems/` | |
| `incoming-item/`, `goods-receipt-note/`, `supplier-invoice/` | |
| `supplier-payment-receipts/` | Read-only |
| `quotation/`, `quotationitem/` | |

Other paths:

| Path | Purpose |
| --- | --- |
| `POST goods-receipts/` | Receive a delivery atomically: supplier invoice + GRN + lines + stock |
| `POST stock-adjustments/` | Manual adjustment |
| `POST stock-transfers/` | Move stock between departments |
| `GET inventory_filter/` | Filtered stock listing |
| `GET purchase-orders/all_purchase_orders/` | |
| `POST allocate-supplier-payment/` | Allocate a supplier payment to supplier invoices |
| PDFs | `purchase_order_pdf/<id>/`, `receipt_note_pdf/<po_id>/`, `requisition_note_pdf/<id>/`, `supplier_invoice_pdf/<supplier_id>/`, `supplier-payment-receipts/<id>/print/` |

## Background tasks (`tasks.py`)

| Task | When | Does |
| --- | --- | --- |
| `check_inventory_reorder_levels` | beat | Emails users in groups with `CAN_RECEIVE_INVENTORY_NOTIFICATIONS` about items at/below re-order level |
| `write_off_expired_stock` | daily 01:00 | `write_off_expired()` |
| `expire_stale_reservations` | every 30 min | Expire overdue reservations |
| `reconcile_stock_balances` | daily 02:00 | Compare `StockBalance` against the ledger |
| `create_insurance_prices_for_item` | on demand | Seed insurer prices for a new item |
| `post_incoming_item` | on demand | Post an incoming item to stock |
| `issue_stock_for_source` | on demand | Generic issue for a source record |

WebSocket: `ws/inventory_notifications/` → `InventoryNotificationConsumer`.

## Management commands

| Command | Purpose |
| --- | --- |
| `rebuild_stock_balances` | Rebuild the balance cache from the ledger |
| `ensure_service_prices` | Make sure service items have a sale price |
| `populate_insurance_item_sale_prices` | Create insurer price rows |

## Tests

`inventory/tests/`: `test_stock_ledger.py`, `test_requisition_process.py`,
`test_supplier_invoice.py`, `test_item_consumables.py`, `test_inventory_views.py`.

## Known issues

- `management/commands/README_SERVICE_INVENTORY.md` documents an
  `ensure_service_inventory` command and per-service "inventory records"; both
  were removed in the ledger migration. The current command is
  `ensure_service_prices`.
- Every viewset not listed under Permissions (items, prices, insurer prices,
  requisitions, purchase orders, supplier invoices, suppliers, departments) uses
  only the default `IsAuthenticated`, so any signed-in user can edit the
  catalogue and prices.
