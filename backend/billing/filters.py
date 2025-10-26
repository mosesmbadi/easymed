import django_filters
from rest_framework import filters
from .models import Invoice
    
class InvoiceFilterSearch(filters.SearchFilter):
    def get_search_fields(self, view, request):
        # Get the value of the 'search_field' query parameter
        search_field_param = request.query_params.get('search_field')

        # Check if the parameter exists and is a valid field name
        if search_field_param in view.search_fields:
            return [search_field_param]
        
        # If the parameter is not provided or is invalid, use the view's default search fields
        return super().get_search_fields(view, request)

class InvoiceFilter(django_filters.FilterSet):
    class Meta:
        model = Invoice
        fields = {
            'status': ['exact'],
            'invoice_date': ['exact', 'gte', 'lte'],
            'patient': ['exact'],
        }

