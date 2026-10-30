from django.db import migrations

UNITS = [
    # Mass / Weight
    ('kg',           'Kilogram',                         'mass'),
    ('g',            'Gram',                             'mass'),
    ('mg',           'Milligram',                        'mass'),
    ('µg',           'Microgram',                        'mass'),
    ('ng',           'Nanogram',                         'mass'),
    ('pg',           'Picogram',                         'mass'),
    ('fg',           'Femtogram',                        'mass'),

    # Volume
    ('L',            'Litre',                            'volume'),
    ('dL',           'Decilitre',                        'volume'),
    ('mL',           'Millilitre',                       'volume'),
    ('µL',           'Microlitre',                       'volume'),
    ('nL',           'Nanolitre',                        'volume'),

    # Length
    ('m',            'Meter',                            'length'),
    ('cm',           'Centimeter',                       'length'),
    ('mm',           'Millimeter',                       'length'),
    ('µm',           'Micrometer',                       'length'),
    ('nm',           'Nanometer',                        'length'),
    ('pm',           'Picometer',                        'length'),

    # Concentration
    ('g/L',          'Grams per Litre',                  'concentration'),
    ('g/dL',         'Grams per Decilitre',              'concentration'),
    ('mg/dL',        'Milligrams per Decilitre',         'concentration'),
    ('mg/L',         'Milligrams per Litre',             'concentration'),
    ('µg/mL',        'Micrograms per Millilitre',        'concentration'),
    ('µg/L',         'Micrograms per Litre',             'concentration'),
    ('ng/mL',        'Nanograms per Millilitre',         'concentration'),
    ('pg/mL',        'Picograms per Millilitre',         'concentration'),
    ('mol/L',        'Moles per Litre',                  'concentration'),
    ('mmol/L',       'Millimoles per Litre',             'concentration'),
    ('µmol/L',       'Micromoles per Litre',             'concentration'),
    ('nmol/L',       'Nanomoles per Litre',              'concentration'),
    ('pmol/L',       'Picomoles per Litre',              'concentration'),
    ('Eq/L',         'Equivalents per Litre',            'concentration'),
    ('mEq/L',        'Milliequivalents per Litre',       'concentration'),

    # Hematology
    ('×10⁹/µL',      'Times 10^9 per Microlitre',        'hematology'),
    ('×10³/µL',      'Times 10^3 per Microlitre',        'hematology'),
    ('cells/µL',     'Cells per Microlitre',             'hematology'),
    ('cells/mm³',    'Cells per Cubic Millimeter',       'hematology'),
    ('L/L',          'Litres per Litre (Hematocrit)',    'hematology'),
    ('%',            'Percentage',                        'hematology'),

    # Enzyme Activity
    ('U/L',          'Units per Litre',                  'enzyme'),
    ('IU/L',         'International Units per Litre',    'enzyme'),
    ('mIU/mL',       'Milli-IU per Millilitre',          'enzyme'),
    ('kU/L',         'Kilo-Units per Litre',             'enzyme'),

    # Hormones & Tumor Markers
    ('IU/mL',        'International Units per Millilitre', 'hormone'),
    ('mIU/L',        'Milli-IU per Litre',               'hormone'),
    ('AU/mL',        'Arbitrary Units per Millilitre',   'hormone'),

    # Microbiology
    ('CFU/mL',       'Colony Forming Units per Millilitre', 'microbiology'),
    ('CFU/g',        'Colony Forming Units per Gram',    'microbiology'),
    ('PFU/mL',       'Plaque Forming Units per Millilitre', 'microbiology'),
    ('copies/mL',    'Copies per Millilitre',            'microbiology'),
    ('log copies/mL','Log Copies per Millilitre',        'microbiology'),

    # Urinalysis
    ('mg/24h',       'Milligrams per 24 Hours',          'urinalysis'),
    ('mmol/24h',     'Millimoles per 24 Hours',          'urinalysis'),
    ('cells/HPF',    'Cells per High Power Field',       'urinalysis'),
    ('casts/LPF',    'Casts per Low Power Field',        'urinalysis'),
    ('SG',           'Specific Gravity',                 'urinalysis'),

    # Coagulation
    ('sec',          'Seconds',                          'coagulation'),
    ('INR',          'International Normalised Ratio',   'coagulation'),

    # Blood Gas
    ('mmHg',         'Millimeters of Mercury',           'blood_gas'),
    ('kPa',          'Kilopascal',                       'blood_gas'),
    ('% sat',        'Percent Saturation',               'blood_gas'),

    # Osmolality & Density
    ('mOsm/kg',      'Milliosmoles per Kilogram',        'osmolality'),
    ('Osm/kg',       'Osmoles per Kilogram',             'osmolality'),
    ('g/mL',         'Grams per Millilitre',             'osmolality'),
    ('kg/L',         'Kilograms per Litre',              'osmolality'),

    # Molecular Biology
    ('ng/µL',        'Nanograms per Microlitre',         'molecular'),
    ('bp',           'Base Pairs',                       'molecular'),
    ('kb',           'Kilobase',                         'molecular'),
    ('Mb',           'Megabase',                         'molecular'),

    # Dose & Ratio
    ('mg/kg',        'Milligrams per Kilogram',          'dose'),
    ('µg/kg',        'Micrograms per Kilogram',          'dose'),
    ('mg/g',         'Milligrams per Gram',              'dose'),
    ('mmol/kg',      'Millimoles per Kilogram',          'dose'),
    ('mL/kg',        'Millilitres per Kilogram',         'dose'),
    ('ratio',        'Ratio',                            'dose'),
    ('index',        'Index',                            'dose'),
    ('score',        'Score',                            'dose'),

    # General
    ('unit',         'Unit',                             'general'),
    ('kits',         'Kits',                             'general'),
]


def seed_units(apps, schema_editor):
    Unit = apps.get_model('inventory', 'Unit')
    for symbol, name, category in UNITS:
        Unit.objects.get_or_create(symbol=symbol, defaults={'name': name, 'category': category})


def unseed_units(apps, schema_editor):
    Unit = apps.get_model('inventory', 'Unit')
    symbols = [u[0] for u in UNITS]
    Unit.objects.filter(symbol__in=symbols).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0006_unit_item_units'),
    ]

    operations = [
        migrations.RunPython(seed_units, reverse_code=unseed_units),
    ]
