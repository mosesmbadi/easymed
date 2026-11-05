from laboratory.report_layouts import URINALYSIS_LAYOUT, ArrangeReportCommand


class Command(ArrangeReportCommand):
    '''
    Groups the urinalysis report under Macroscopy, Biochemistry and Microscopy.
    Safe to run again.
    python manage.py arrange_urinalysis_report [--profile "Exact Name"]
    '''
    help = "Group and order the urinalysis panels under Macroscopy, Biochemistry and Microscopy"
    layout = URINALYSIS_LAYOUT
    profile_names = ('Urinalysis', 'Urine Analysis')
