from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import MODULE_LABELS, SWITCHABLE_MODULES, Company, CompanyBranch, InsuranceCompany
from .serializers import (
    FacilityProfileSerializer, CompanyBranchSerializer, InsuranceCompanySerializer, FacilitySerializer)
from authperms.permissions import IsSystemsAdminUser


class FacilityView(APIView):
    """
    The facility type and the modules it has.

    Separate from the profile because every signed-in user needs this to draw
    the sidebar. A deployment not set up yet has every module.
    """

    def get(self, request):
        company = Company.current()
        if company is None:
            return Response({
                'facility_type': Company.FacilityType.HOSPITAL,
                'enabled_modules': list(SWITCHABLE_MODULES),
                'disabled_modules': [],
                'module_labels': MODULE_LABELS,
            })
        return Response(FacilitySerializer(company).data)


class FacilityProfileView(APIView):
    """
    The facility running this deployment: GET for anyone signed in, since
    reports and the sidebar print its name; PATCH or PUT for its admin. There
    is one, so no id and no list. The first save creates it.
    """

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsSystemsAdminUser()]

    def get(self, request):
        company = Company.current()
        if company is None:
            return Response({'detail': "The facility profile hasn't been set up yet."},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(FacilityProfileSerializer(company, context={'request': request}).data)

    def patch(self, request):
        return self._save(request, partial=True)

    def put(self, request):
        return self._save(request, partial=False)

    def _save(self, request, partial):
        company = Company.current()
        serializer = FacilityProfileSerializer(
            company, data=request.data, partial=partial and company is not None,
            context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CompanyBranchViewSets(viewsets.ModelViewSet):
    queryset = CompanyBranch.objects.all()
    serializer_class = CompanyBranchSerializer

    def perform_create(self, serializer):
        company = Company.current()
        if company is None:
            raise ValidationError("Set up the facility profile before adding branches.")
        serializer.save(company=company)


class InsuranceCompanyViewSet(viewsets.ModelViewSet):
    """Credit accounts. ?account_type=insurer|corporate|facility narrows the list."""
    queryset = InsuranceCompany.objects.all().order_by('name')
    serializer_class = InsuranceCompanySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        account_type = self.request.query_params.get('account_type')
        if account_type:
            queryset = queryset.filter(account_type=account_type)
        return queryset
