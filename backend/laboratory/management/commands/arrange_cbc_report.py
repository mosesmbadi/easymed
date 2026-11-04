from django.core.management.base import BaseCommand, CommandError

from laboratory.models import LabTestPanel, LabTestProfile

# The blocks and order of the analyzer's own CBC printout.
CBC_BLOCKS = [
    ['WBC', 'LYM%', 'MID%', 'GRA%', 'LYM', 'MID', 'GRA'],
    ['HGB', 'MCH', 'MCHC'],
    ['RBC', 'MCV', 'RDWs', 'RDWc', 'HCT'],
    ['PLT', 'PCT', 'PDWs', 'PDWc', 'MPV', 'P-LCC', 'P-LCR'],
]


class Command(BaseCommand):
    '''
    Lays the CBC report out as the analyzer prints it. Safe to run again.
    python manage.py arrange_cbc_report
    '''
    help = "Group and order the CBC panels as on the analyzer's printout"

    def handle(self, *args, **options):
        profile = LabTestProfile.objects.filter(
            name__istartswith='Complete Blood Count', parent__isnull=True).first()
        if profile is None:
            raise CommandError("No main profile named 'Complete Blood Count' found.")

        panels = LabTestPanel.objects.filter(
            test_profile__in=[node.pk for node in profile.with_descendants()])
        by_name = {panel.name.strip().lower(): panel for panel in panels}

        missing = []
        for report_group, names in enumerate(CBC_BLOCKS, start=1):
            for sort_order, name in enumerate(names, start=1):
                panel = by_name.pop(name.lower(), None)
                if panel is None:
                    missing.append(name)
                    continue
                LabTestPanel.objects.filter(pk=panel.pk).update(
                    report_group=report_group, sort_order=sort_order)

        self.stdout.write(self.style.SUCCESS(f"Arranged the panels of {profile.name}."))
        if missing:
            self.stdout.write(self.style.WARNING(f"No panel for: {', '.join(missing)}"))
        if by_name:
            leftover = ', '.join(panel.name for panel in by_name.values())
            self.stdout.write(self.style.WARNING(f"Not on the printout, left as they were: {leftover}"))
