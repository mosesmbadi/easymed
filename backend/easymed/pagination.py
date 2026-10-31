from rest_framework.pagination import PageNumberPagination


class OptInPageNumberPagination(PageNumberPagination):
    """
    Pages only when asked: `?page=` (and `?page_size=`) returns
    {count, next, previous, results}; without `page` the list comes back
    whole, as callers written before paging expect.
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 200

    def paginate_queryset(self, queryset, request, view=None):
        if self.page_query_param not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
