from laboratory.report_layouts import CBC_LAYOUT, ArrangeReportCommand


class Command(ArrangeReportCommand):
    '''
    Groups the CBC report under RBC, WBC and Platelets. Safe to run again.
    python manage.py arrange_cbc_report [--profile "Exact Name"]
    '''
    help = "Group and order the CBC panels under RBC, WBC and Platelets"
    layout = CBC_LAYOUT
    profile_names = ('Complete Blood Count', 'CBC', 'Full Hemogram', 'Full Haemogram')
