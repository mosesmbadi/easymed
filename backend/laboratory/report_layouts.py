"""
How the lab wants its reports laid out, applied to panels that already exist.

A layout is a list of headings, each with its panels in print order. A panel is
matched by any of the names on its row, first name being the usual one, because
each lab names its panels its own way.
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from laboratory.models import LabTestPanel, LabTestProfile

CBC_LAYOUT = [
    ('RBC', [
        ('RBC', 'Rbc Count', 'Red Blood Cell Count'),
        ('HGB', 'Hb', 'Hemoglobin', 'Haemoglobin'),
        ('HCT', 'Hematocrit', 'Haematocrit'),
        ('MCV', 'Mean Corpuscular Volume (MCV)'),
        ('MCH',),
        ('MCHC',),
        ('RDWs', 'RDW-SD'),
        ('RDWc', 'RDW-CV'),
    ]),
    ('WBC', [
        ('WBC', 'Wbc Count', 'White Blood Cell Count'),
        ('LYM%',),
        ('LYM', 'LYM#'),
        ('MID%',),
        ('MID', 'MID#'),
        ('GRA%',),
        ('GRA', 'GRA#'),
    ]),
    ('Platelets', [
        ('PLT', 'Plts Count', 'Platelet Count'),
        ('PCT',),
        ('PDWs', 'PDW-SD'),
        ('PDWc', 'PDW-CV'),
        ('MPV',),
        ('P-LCC',),
        ('P-LCR',),
    ]),
]

URINALYSIS_LAYOUT = [
    ('Macroscopy', [
        ('Colour', 'Color'),
        ('Consistency',),
    ]),
    # The order of the reagent strip.
    ('Biochemistry', [
        ('LEU', 'Leukocytes', 'Leucocytes'),
        ('NIT', 'Nitrite', 'Nitrites'),
        ('URO', 'UROBIL', 'Urobilinogen'),
        ('PRO', 'PROT', 'Protein'),
        ('pH',),
        ('BLD', 'Blood'),
        ('SG', 'Specific Gravity'),
        ('KET', 'Ketones'),
        ('BIL', 'Bilirubin'),
        ('GLU', 'Glucose'),
    ]),
    ('Microscopy', [
        ('Pus Cells',),
        ('Red Cells',),
        ('Epithelial Cells',),
    ]),
]


class ArrangeReportCommand(BaseCommand):
    """Moves a main profile's panels under a layout's headings. Safe to run again."""
    layout = ()
    # What the main profile's name starts with, unless --profile says otherwise.
    profile_names = ()

    def add_arguments(self, parser):
        parser.add_argument('--profile', help="The main profile's exact name, when its usual name is not found")

    def find_main_profile(self, exact_name):
        main_profiles = LabTestProfile.objects.filter(parent__isnull=True)
        if exact_name:
            found = list(main_profiles.filter(name__iexact=exact_name))
        else:
            starts_with = Q()
            for name in self.profile_names:
                starts_with |= Q(name__istartswith=name)
            found = list(main_profiles.filter(starts_with))

        if len(found) == 1:
            return found[0]
        if found:
            names = ', '.join(f'"{profile.name}"' for profile in found)
            raise CommandError(f"More than one main profile matches: {names}. Choose one with --profile.")
        raise CommandError(f"No main profile found. Name it with --profile. Looked for: {exact_name or self.profile_names}")

    @transaction.atomic
    def handle(self, *args, **options):
        main = self.find_main_profile(options.get('profile'))
        panels = LabTestPanel.objects.filter(
            test_profile__in=[node.pk for node in main.with_descendants()])
        by_name = {panel.name.strip().lower(): panel for panel in panels}

        missing = []
        for heading_order, (heading, rows) in enumerate(self.layout, start=1):
            placed = []
            for panel_order, names in enumerate(rows, start=1):
                panel = next((by_name.pop(name.lower()) for name in names if name.lower() in by_name), None)
                if panel is None:
                    missing.append(names[0])
                else:
                    placed.append((panel, panel_order))
            if not placed:
                continue

            sub_profile = LabTestProfile.objects.filter(parent=main, name__iexact=heading).first()
            if sub_profile is None:
                sub_profile = LabTestProfile(parent=main)
            sub_profile.name = heading
            sub_profile.sort_order = heading_order
            sub_profile.save()

            for panel, panel_order in placed:
                LabTestPanel.objects.filter(pk=panel.pk).update(
                    test_profile=sub_profile, sort_order=panel_order, report_group=0)

        self.stdout.write(self.style.SUCCESS(f"Arranged the panels of {main.name}."))
        if missing:
            self.stdout.write(self.style.WARNING(f"No panel for: {', '.join(missing)}"))
        if by_name:
            leftover = ', '.join(panel.name for panel in by_name.values())
            self.stdout.write(self.style.WARNING(f"Not in the layout, left where they were: {leftover}"))
