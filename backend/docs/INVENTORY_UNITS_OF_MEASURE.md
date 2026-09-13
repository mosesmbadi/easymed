# Items and Units of Measure

How inventory counts things, and how a unit travels from the person raising a
requisition all the way down to the stock ledger.

## The one rule

**Every quantity the stock ledger stores is in the item's base unit.** There are
no exceptions and no second opinion. `StockMovement`, `StockBalance`,
`StockLot`, reservations, re-order levels, reagent and sample-collection
consumption — all base units.

Everything else in this document exists so that people can work in boxes and
cartons without the ledger ever having to know that boxes exist.

## The two levels

### Base unit — `Item.units_of_measure`

The smallest thing you can issue. A tablet, a roll, a test, a millilitre. It is
a **required** field (`CheckConstraint: item_base_unit_required`) because a
quantity with no unit is exactly what makes pack handling guesswork.

It is also part of `Item`'s uniqueness key, so the same product name in two
different base units is two different items:

```python
unique_together = ('name', 'category', 'units_of_measure')
```

### Pack sizes — `ItemUnit`

One row per container **bigger** than the base unit.

| Field | Meaning |
| --- | --- |
| `item` | The item this pack belongs to |
| `name` | What people call it: `Box`, `Carton`, `Strip`, `Kit` |
| `factor_to_base` | How many base units it holds |
| `is_purchase_default` | Pre-selected when ordering / receiving |
| `is_sale_default` | Pre-selected when issuing, and used for display breakdowns |

The base unit is **never** a row here — it is implicit, factor 1. `clean()`
rejects `factor_to_base == 1` for that reason.

Nesting refers every level back to the base unit, never to the level above it.
This is the same choice Sage 300 and most ledger systems make, and it means a
carton's factor does not silently change when someone edits the box:

```
syringe (base)          implicit, factor 1
Box                     factor 12      -> a box of 12 syringes
Carton                  factor 120     -> a carton of 10 boxes, stated as 120
```

### Do not confuse `ItemUnit` with `Unit`

They are unrelated despite the names.

- **`Unit`** (`inventory.Unit`) is a vocabulary of measurement symbols — `mg`,
  `mL`, `g/dL` — grouped by category. It is what `LabTestPanel.units` points at
  to say what a *result* is measured in. It carries no conversion factor.
- **`ItemUnit`** is a per-item packaging conversion. It is the only thing that
  converts quantities.

## The flow

The unit is declared **once**, on the requisition line, and read back down the
chain. Conversion to base units happens exactly **once**, at goods receipt.

```
  Requisition line                 "6 Boxes"        item_unit = Box (x12)
  RequisitionItem.item_unit        <-- declared here, the single source
        |
        |  PurchaseOrderItem.item_unit is a PROPERTY that reads
        |  requisition_item.item_unit. Nothing is copied, so the
        |  order and the requisition can never disagree.
        v
  Purchase order line              "6 Boxes"        quantity_ordered = 6
  PurchaseOrderItem                                 quantity_received = 6
        |
        |  Receiving prefills IncomingItem.item_unit from the PO line
        |  and shows it READ-ONLY: you receive what you ordered.
        v
  Goods receipt line               "6 Boxes"        quantity = 6
  IncomingItem.item_unit                            purchase_price = per Box
        |
        |  >>> THE ONLY CONVERSION <<<
        |  base_units = quantity * conversion_factor        6 * 12 = 72
        |  unit_cost  = purchase_price / conversion_factor  2400 / 12 = 200
        v
  Stock ledger                     72 syringes @ 200 each
  StockMovement / StockBalance     base units, always
        |
        |  Issuing may optionally work in packs:
        |  stock.issue(item=..., quantity=2, item_unit=box) -> takes 24
        v
  Dispensing / billing / lab       base units
```

### Quantities are in the ordering unit, not base units

This is the part that trips people up. On a requisition or purchase order line,
`quantity_requested`, `quantity_approved`, `quantity_ordered` and
`quantity_received` are **counts of `item_unit`**, not base units. Six boxes is
`6`, not `72`.

Every model exposes the base-unit figure explicitly so nothing has to guess:

| Model | Ordering-unit field | Base-unit accessor |
| --- | --- | --- |
| `RequisitionItem` | `quantity_requested` | `base_quantity_requested` |
| `RequisitionItem` | `quantity_approved` | `base_quantity_approved` |
| `PurchaseOrderItem` | `quantity_ordered` | `base_quantity_ordered` |
| `PurchaseOrderItem` | `quantity_received` | `base_quantity_received` |
| `IncomingItem` | `quantity` | `base_units` |

All of them also expose `conversion_factor` (1 when the line is loose) and
`unit_label` (the pack name, or the item's base unit when there is no pack).

## Pricing

Prices follow whichever unit their quantity is in. Get this wrong and costs land
out by the conversion factor, silently.

- **`RequisitionItem.unit_cost`** — agreed price for **one `item_unit`**. Price
  per box.
- **`IncomingItem.purchase_price`** — price for **one `item_unit`**. Price per
  box. The ledger divides it down: `unit_cost = purchase_price / factor`.
- **`Item.current_cost`** (a.k.a. `buying_price`) — weighted-average cost **per
  base unit**, computed from the ledger. Price per syringe.
- **`ItemPrice.sale_price`** — cash sale price **per base unit**. Only items
  that are actually sold have one (`Item.is_sellable`); reagents, lab
  consumables and internal items have none. A lab test's price is set on its
  Test Panel and stored here against the panel's billing item, so it is the
  price of **one run** of the test, never of a kit.
- **`InvoiceItem.unit_price`** — what one base unit was actually charged at,
  frozen when the line is billed. `item_amount = unit_price x quantity`.

Because `current_cost` and `sale_price` are per base unit, anything quoting a
requisition or
purchase order line has to scale up. That is what
`RequisitionItem.effective_unit_cost` is for, and it is the **only** place the
rule lives:

```python
@property
def effective_unit_cost(self):
    if self.unit_cost is not None:      # already per pack
        return self.unit_cost
    return (self.item.current_cost or 0) * self.conversion_factor
```

Serializers and both PDF views call it, so `quantity x price` multiplies like
with like everywhere. If you add a new cost calculation on a procurement line,
call it too — do not reach for `item.current_cost` directly.

## Worked example

Paracetamol, stocked in **tablets**, with a `Strip` pack of 10.

| Step | What is entered | What is stored |
| --- | --- | --- |
| Requisition | 5, unit `Strip` | `quantity_requested = 5`, `item_unit = Strip` |
| Purchase order | — | `quantity_ordered = 5` (strips) |
| LPO to supplier | — | "5 Strip · 50 tablets in total" |
| Goods receipt | 5 strips @ KES 200 each | `quantity = 5`, `purchase_price = 200` |
| Ledger | — | **50 tablets @ KES 20 each** |
| Dispensing | 3 tablets | movement of `-3` |

## Where the code lives

| Concern | Location |
| --- | --- |
| Models, conversion properties | `inventory/models.py` — `Item`, `ItemUnit`, `RequisitionItem`, `PurchaseOrderItem`, `IncomingItem` |
| The only writer of stock | `inventory/services/stock.py` — `receive_incoming_item`, `issue(item_unit=...)` |
| Cost rule | `RequisitionItem.effective_unit_cost`, wrapped by `_unit_cost_for` in `inventory/serializers.py` |
| Pack-size API | `/inventory/item-units/` — filter by `?item=<id>` |
| Line-uniqueness rule | `inventory/validators.py` — the unit is part of a line's identity |
| Managing pack sizes (UI) | Inventory → Items → row menu → **Pack Sizes** |
| Choosing an ordering unit (UI) | The **Order in** select on requisition entry |

## Rules of thumb

1. **Never write a quantity to the ledger without converting first.** Only
   `inventory.services.stock` writes movements, and it takes base units unless
   you hand it an `item_unit`.
2. **Never sum quantities across lines in different units.** Six boxes plus four
   loose units is not ten of anything. This is why `item_unit` is part of the
   key when requisition lines are merged, both in
   `validate_requisition_item_uniqueness` and in `RequisitionSerializer.create`.
3. **A pack belongs to exactly one item.** Serializers and `issue()` reject an
   `item_unit` whose `item_id` does not match, so a Box of 12 syringes can never
   be used to receive gauze.
4. **Changing `factor_to_base` does not rewrite history.** Movements already
   posted keep the quantities and costs they were posted with, which is correct
   — the ledger records what happened, not what the catalogue says today.
5. **A factor of 1 is not a pack.** It is the base unit; do not create a row.

## History

`Item` used to carry two integer columns, `packed` and `subpacked`. Only
`subpacked` ever did anything — it converted a pack into base units at goods
receipt — and `packed` was never read by any code. Neither could express a third
tier, and the receiving form never sent the unit selector, so the conversion was
unreachable from the UI and every receipt was silently treated as loose units.

Both columns were replaced by `ItemUnit` in migration
`0018_item_unit_conversions`, which carries old `subpacked` values over as a
`Pack` row. Migration `0019_requisition_item_unit` then pushed the unit up to
the requisition, so ordering and receiving finally agree, and made
`units_of_measure` required.

**See also:** `INVENTORY_FLOW.md` for the end-to-end purchasing flow,
`LAB_REAGENTS_SETUP.md` for how the lab counts reagents in tests and collection
items per draw, and `BILLING_AMOUNTS.md` for how a sold quantity is priced.
