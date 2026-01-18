# Lab Reagents and Test Setup

## Overview

The system now includes comprehensive demo data for lab reagents, test panels, and their relationships. This enables realistic lab testing workflows including reagent tracking, stock management, and automated test counting.

## What's Included

### 1. Lab Test Profiles (3 profiles)

- **Complete Blood Count (CBC)** - 6 test panels
- **Liver Function Test (LFT)** - 6 test panels
- **Lipid Profile** - 4 test panels

### 2. Lab Reagents (8 reagent kits)

#### Hematology

- **Sysmex CBC Reagent Kit** (SYS-CBC-500)
  - 500 tests per kit
  - Stock: 2 kits (1000 tests)
  - Price: KES 15,000 → 18,000 per kit
  - Used for: All CBC tests

#### Clinical Chemistry - LFT

- **Roche ALT/AST Reagent** (ROCHE-ALT-AST-200)
  - 200 tests per kit
  - Stock: 2 kits (400 tests)
  - Price: KES 8,000 → 10,000 per kit
  - Used for: ALT, AST tests

- **Roche Alkaline Phosphatase Reagent** (ROCHE-ALP-200)
  - 200 tests per kit
  - Stock: 2 kits (400 tests)
  - Price: KES 7,500 → 9,500 per kit
  - Used for: ALP test

- **Roche Total Bilirubin Reagent** (ROCHE-TBIL-200)
  - 200 tests per kit
  - Stock: 2 kits (400 tests)
  - Price: KES 8,500 → 10,500 per kit
  - Used for: Bilirubin test

- **Roche Albumin/Total Protein Reagent** (ROCHE-ALB-TP-250)
  - 250 tests per kit
  - Stock: 2 kits (500 tests)
  - Price: KES 9,000 → 11,500 per kit
  - Used for: Albumin, Total Protein

#### Clinical Chemistry - Lipids

- **Abbott Cholesterol Reagent** (ABB-CHOL-300)
  - 300 tests per kit
  - Stock: 2 kits (600 tests)
  - Price: KES 10,000 → 12,500 per kit
  - Used for: Total Cholesterol

- **Abbott Triglycerides Reagent** (ABB-TRIG-300)
  - 300 tests per kit
  - Stock: 2 kits (600 tests)
  - Price: KES 9,500 → 12,000 per kit
  - Used for: Triglycerides

- **Abbott HDL/LDL Reagent** (ABB-HDL-LDL-250)
  - 250 tests per kit
  - Stock: 2 kits (500 tests)
  - Price: KES 11,000 → 14,000 per kit
  - Used for: HDL, LDL Cholesterol

### 3. Inventory Records

All reagents have proper inventory records with:

- Purchase and sale prices
- Stock quantities (in tests)
- Expiry dates (2 years from creation)
- Lot numbers
- Department assignment (Lab)

### 4. Test-Reagent Links

Each lab test panel is linked to the reagents it consumes:

- **18 total links** created
- **1 test consumed per run** (standard)
- Enables automatic reagent deduction when tests are performed

### 5. Stock Counters

Each reagent has a `TestKitCounter` tracking:

- Available tests
- Minimum threshold for alerts
- Automated counting when tests run

## Setup Commands

### Generate All Demo Data (Recommended)

```bash
# Run full demo data generation
docker exec -it api python manage.py generate_dummy_data
```

This will create:

- Users, companies, insurances
- Departments, suppliers
- Items (drugs, equipment, services)
- **Lab reagents with inventory**
- Lab test profiles and panels
- Test-reagent links
- Stock counters
- Reference values and interpretations

### Re-create Lab Data Only

```bash
# If you need to refresh just the lab data
docker exec -it api python manage.py shell
>>> from customuser.management.utils.data_generators import create_real_world_lab_data
>>> result = create_real_world_lab_data()
```

### Ensure Service Inventory

```bash
# Make sure all lab tests and appointments have pricing
docker exec -it api python manage.py ensure_service_inventory
```

## Verification

Check reagent inventory:

```python
from inventory.models import Item, Inventory

reagents = Item.objects.filter(category='LabReagent')
for reagent in reagents:
    inv = Inventory.objects.filter(item=reagent).first()
    if inv:
        print(f'{reagent.name}: {inv.quantity_at_hand} tests @ KES {inv.sale_price}')
```

Check test-reagent links:

```python
from laboratory.models import TestPanelReagent

links = TestPanelReagent.objects.select_related('test_panel', 'reagent_item')
for link in links:
    print(f'{link.test_panel.name} → {link.reagent_item.name}')
```

## Usage Workflow

1. **Patient Registration** → Create patient
2. **Doctor Orders Tests** → Select test profile (e.g., CBC)
3. **Lab Receives Request** → All panels in profile are queued
4. **Lab Runs Tests** → System automatically:
   - Deducts reagent from counter
   - Tracks remaining tests
   - Alerts when below threshold
5. **Results Entry** → Lab tech enters values
6. **Billing** → System bills for each panel using Item prices

## Business Logic

### Pricing Model

```
Item (Lab Test) → Inventory.sale_price → Patient charged
Item (Reagent) → Inventory.sale_price → Cost per test
```

### Cost Calculation

When a CBC test is run:

- **Patient pays**: KES 500 (Lab Test item price)
- **Reagent consumed**: 1/500th of CBC kit = KES 36/test
- **Gross profit**: KES 464 per test

### Stock Management

- Each test run decrements `TestKitCounter.available_tests`
- When `available_tests < minimum_threshold` → Alert
- Purchase Order can be generated for reagent restocking

## Files Modified

### Backend

- `backend/customuser/management/utils/data_generators.py`
  - Enhanced `create_real_world_lab_data()` function
  - Added inventory creation for all reagents
  - Added realistic pricing

- `backend/customuser/management/commands/generate_dummy_data.py`
  - Added service inventory creation
  - Enhanced output messaging

### Database

- **Inventory** table: +8 reagent records
- **TestPanelReagent** table: +18 linkage records
- **TestKitCounter** table: +8 counter records

## Troubleshooting

### No reagents showing?

```bash
docker exec -it api python manage.py shell -c "
from inventory.models import Item
print(Item.objects.filter(category='LabReagent').count())
"
```

### Reagents have no inventory?

Run the ensure script:

```bash
docker exec -it api python manage.py ensure_service_inventory
```

### Test-reagent links missing?

Re-run the lab data generator - it uses `get_or_create` so it's safe.

## Future Enhancements

1. **Reagent Lot Tracking** - Multiple lots per reagent
2. **Quality Control** - QC material consumption
3. **Calibration Tracking** - Link calibrators to reagents
4. **Supplier Integration** - Auto-order when stock low
5. **Cost Analysis** - Profit per test reporting

## Total Demo Value

**Lab Reagent Inventory**: KES 196,000  
**Test Capacity**: 4,400 tests across all profiles  
**Average Cost per Test**: ~KES 45  
**Average Revenue per Test**: ~KES 500  
**Potential Profit**: ~KES 2,002,000 if all tests sold

---

**Status**: ✅ Production Ready  
**Last Updated**: January 18, 2026  
**Version**: 1.0
