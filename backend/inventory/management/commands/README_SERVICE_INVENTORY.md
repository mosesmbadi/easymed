# Service Inventory Management

## Problem
Service items (Lab Tests, Appointments) are not physical inventory but need pricing records for billing. Without inventory records, these items show as **0 price** in invoices.

## Solution
The `ensure_service_inventory` management command creates inventory records for all service items.

## Usage

### Create missing inventory records (safe - doesn't modify existing):
```bash
python manage.py ensure_service_inventory
```

### Update existing prices (use carefully):
```bash
python manage.py ensure_service_inventory --update-prices
```

### Custom pricing:
```bash
python manage.py ensure_service_inventory \
  --lab-test-price 750.00 \
  --appointment-price 1500.00
```

## When to Run

Run this command:
1. **After initial setup** - Ensure all service items have prices
2. **When adding new lab tests** - Create inventory for new items
3. **When prices need updating** - Bulk update service prices
4. **If items show 0 price** - Fix missing inventory records

## Docker Usage
```bash
docker exec -it api python manage.py ensure_service_inventory
```

## What It Does

1. Finds all items with categories:
   - Lab Test
   - General Appointment
   - Specialized Appointment

2. For each item without inventory:
   - Creates an Inventory record
   - Sets default prices (500 for labs, 1000 for appointments)
   - Sets quantity to 9999 (unlimited for services)
   - Assigns to "General" department

3. With `--update-prices` flag:
   - Updates existing inventory prices to match defaults

## Technical Details

**Default Settings:**
- Department: General
- Purchase Price: 0.00 (services have no cost)
- Sale Price: 500.00 (lab tests) or 1000.00 (appointments)
- Quantity: 9999 (services don't run out)
- Category: Internal
- Lot Number: SERVICE-001
- Expiry Date: 2030-12-31

## Related Files
- Model: `inventory.models.Inventory`
- Billing Logic: `billing.models.InvoiceItem.get_pricing_for_item()`
- Frontend: `CategorizedItems.js`
