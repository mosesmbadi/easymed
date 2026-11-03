"""
API for the analyzer interface: the endpoint the LIS server posts to, the
Analyzer Inbox, and each analyzer's test mappings. The matching itself lives
in laboratory.analyzers.
"""
from datetime import timedelta

from django.db.models import Count, Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from authperms.permissions import HasAnyNamedPermission

from . import analyzers
from .models import AnalyzerMessage, AnalyzerResult, AnalyzerTestMapping, LabEquipment

LAB_ACCESS = HasAnyNamedPermission('CAN_ACCESS_LABORATORY_DASHBOARD')

# How far back the inbox looks when asked for every result, not just the
# open ones.
HISTORY_DAYS = 30
HISTORY_LIMIT = 500


# ---------------------------------------------------------------- serializers

class IncomingResultSerializer(serializers.Serializer):
    code = serializers.CharField()
    value = serializers.CharField(allow_blank=True, required=False, default='')
    unit = serializers.CharField(allow_blank=True, required=False, default='')
    flag = serializers.CharField(allow_blank=True, required=False, default='')
    reference_range = serializers.CharField(allow_blank=True, required=False, default='')


class IncomingMessageSerializer(serializers.Serializer):
    """What the LIS server posts for one analyzer message."""
    equipment = serializers.IntegerField(required=False, allow_null=True)
    sender = serializers.CharField(allow_blank=True, required=False, default='')
    sample_code = serializers.CharField(allow_blank=True, required=False, default='')
    patient_name = serializers.CharField(allow_blank=True, required=False, default='')
    raw_message = serializers.CharField(allow_blank=True, required=False, default='', trim_whitespace=False)
    results = IncomingResultSerializer(many=True)


class ReceivedResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyzerResult
        fields = ['analyzer_code', 'value', 'status', 'detail']


class ReceivedMessageSerializer(serializers.ModelSerializer):
    """The LIS server logs this, so it can say what became of each result."""
    equipment_name = serializers.CharField(source='equipment.name', default=None, read_only=True)
    results = ReceivedResultSerializer(many=True, read_only=True)

    class Meta:
        model = AnalyzerMessage
        fields = ['id', 'equipment', 'equipment_name', 'sender', 'sample_code', 'received_at', 'results']


class AnalyzerMessageSerializer(serializers.ModelSerializer):
    equipment_name = serializers.CharField(source='equipment.name', default=None, read_only=True)

    class Meta:
        model = AnalyzerMessage
        fields = ['id', 'equipment', 'equipment_name', 'sender', 'sample_code', 'patient_name',
                  'raw_message', 'received_at']


class AnalyzerResultSerializer(serializers.ModelSerializer):
    received_at = serializers.DateTimeField(source='message.received_at', read_only=True)
    equipment = serializers.IntegerField(source='message.equipment_id', read_only=True)
    equipment_name = serializers.CharField(source='message.equipment.name', default=None, read_only=True)
    sender = serializers.CharField(source='message.sender', read_only=True)
    sample_code = serializers.CharField(source='message.sample_code', read_only=True)
    patient_name = serializers.CharField(source='message.patient_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    test_panel_name = serializers.CharField(
        source='lab_test_request_panel.test_panel.name', default=None, read_only=True)
    resolved_by_name = serializers.SerializerMethodField()
    is_open = serializers.BooleanField(read_only=True)

    class Meta:
        model = AnalyzerResult
        fields = ['id', 'message', 'received_at', 'equipment', 'equipment_name', 'sender',
                  'sample_code', 'patient_name', 'analyzer_code', 'value', 'unit', 'flag',
                  'reference_range', 'status', 'status_display', 'detail', 'test_panel_name',
                  'is_open', 'resolved_by_name', 'updated_at']

    def get_resolved_by_name(self, obj):
        user = obj.resolved_by
        return f"{user.first_name} {user.last_name}".strip() if user else None


class AnalyzerTestMappingSerializer(serializers.ModelSerializer):
    test_panel_name = serializers.CharField(source='test_panel.name', default=None, read_only=True)
    test_profile_name = serializers.CharField(
        source='test_panel.test_profile.name', default=None, read_only=True)

    class Meta:
        model = AnalyzerTestMapping
        fields = ['id', 'equipment', 'analyzer_code', 'test_panel', 'test_panel_name',
                  'test_profile_name', 'created_at', 'updated_at']
        validators = []  # the unique pair is checked below, with a readable message

    def validate_analyzer_code(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Enter the code the analyzer sends.")
        return value

    def validate(self, attrs):
        equipment = attrs.get('equipment') or getattr(self.instance, 'equipment', None)
        code = attrs.get('analyzer_code') or getattr(self.instance, 'analyzer_code', '')
        clash = AnalyzerTestMapping.objects.filter(equipment=equipment, analyzer_code__iexact=code)
        if self.instance:
            clash = clash.exclude(pk=self.instance.pk)
        if clash.exists():
            raise serializers.ValidationError(
                {'analyzer_code': f"{code} is already mapped for this analyzer."})
        return attrs


class AssignSampleSerializer(serializers.Serializer):
    sample_code = serializers.CharField()


# ---------------------------------------------------------------------- views

class AnalyzerMessageViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin,
                             viewsets.GenericViewSet):
    """
    POST: the LIS server delivers one analyzer message. It is stored whatever
    happens to its results, so a 201 means the message is safe and the LIS
    server can acknowledge it to the analyzer.
    """
    queryset = AnalyzerMessage.objects.select_related('equipment')
    serializer_class = AnalyzerMessageSerializer
    permission_classes = [LAB_ACCESS]

    @extend_schema(request=IncomingMessageSerializer, responses=ReceivedMessageSerializer)
    def create(self, request, *args, **kwargs):
        incoming = IncomingMessageSerializer(data=request.data)
        incoming.is_valid(raise_exception=True)
        message = analyzers.receive_message(incoming.validated_data)
        return Response(ReceivedMessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=AssignSampleSerializer, responses=AnalyzerResultSerializer(many=True))
    @action(detail=True, methods=['post'], url_path='assign-sample')
    def assign_sample(self, request, pk=None):
        message = self.get_object()
        body = AssignSampleSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        analyzers.assign_sample(message, body.validated_data['sample_code'], request.user)
        results = message.results.select_related(
            'message__equipment', 'lab_test_request_panel__test_panel', 'resolved_by')
        return Response(AnalyzerResultSerializer(results, many=True).data)


class AnalyzerResultViewSet(viewsets.ReadOnlyModelViewSet):
    """
    The Analyzer Inbox. By default only results still waiting on someone;
    ?status=all for the last 30 days, or ?status=<status> for one kind.
    Also filters on ?equipment=<id> and ?sample_code=.
    """
    serializer_class = AnalyzerResultSerializer
    permission_classes = [LAB_ACCESS]

    def get_queryset(self):
        queryset = AnalyzerResult.objects.select_related(
            'message__equipment', 'lab_test_request_panel__test_panel', 'resolved_by')
        params = self.request.query_params

        wanted = params.get('status', 'open')
        if wanted == 'open':
            queryset = queryset.exclude(status__in=AnalyzerResult.CLOSED_STATUSES)
        elif wanted != 'all':
            queryset = queryset.filter(status=wanted)

        if self.action == 'list' and wanted != 'open':
            since = timezone.now() - timedelta(days=HISTORY_DAYS)
            queryset = queryset.filter(message__received_at__gte=since)

        if params.get('equipment'):
            queryset = queryset.filter(message__equipment_id=params['equipment'])
        if params.get('sample_code'):
            queryset = queryset.filter(message__sample_code__icontains=params['sample_code'].strip())
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()[:HISTORY_LIMIT]
        return Response(self.get_serializer(queryset, many=True).data)

    def _all_results(self):
        return AnalyzerResult.objects.select_related(
            'message__equipment', 'lab_test_request_panel__test_panel', 'resolved_by')

    @action(detail=True, methods=['post'])
    def retry(self, request, pk=None):
        result = get_object_or_404(self._all_results(), pk=pk)
        analyzers.retry([result], request.user)
        return Response(self.get_serializer(result).data)

    @action(detail=True, methods=['post'])
    def ignore(self, request, pk=None):
        result = get_object_or_404(self._all_results(), pk=pk)
        if not result.is_open:
            return Response({'detail': f"This result is already {result.get_status_display().lower()}."},
                            status=status.HTTP_400_BAD_REQUEST)
        analyzers.ignore(result, request.user)
        return Response(self.get_serializer(result).data)

    @action(detail=False, methods=['post'], url_path='retry-open')
    def retry_open(self, request):
        """Retry everything waiting, e.g. after registering late samples."""
        retried = analyzers.retry(analyzers.open_results().select_related('message'), request.user)
        posted = sum(1 for result in retried if result.status == AnalyzerResult.Status.POSTED)
        return Response({'retried': len(retried), 'posted': posted})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Open results per status, for the inbox badge and filter chips."""
        counts = (analyzers.open_results()
                  .values('status').annotate(count=Count('id')).order_by())
        by_status = {row['status']: row['count'] for row in counts}
        return Response({'open': sum(by_status.values()), 'by_status': by_status})


class AnalyzerTestMappingViewSet(viewsets.ModelViewSet):
    """
    One analyzer's code-to-panel table, ?equipment=<id>. Saving a mapping
    retries the inbox results that were waiting on that code.
    """
    serializer_class = AnalyzerTestMappingSerializer
    permission_classes = [LAB_ACCESS]

    def get_queryset(self):
        queryset = AnalyzerTestMapping.objects.select_related(
            'equipment', 'test_panel__test_profile')
        equipment = self.request.query_params.get('equipment')
        if equipment:
            queryset = queryset.filter(equipment_id=equipment)
        return queryset

    def perform_create(self, serializer):
        mapping = serializer.save()
        analyzers.retry_for_mapping(mapping, self.request.user)

    def perform_update(self, serializer):
        mapping = serializer.save()
        analyzers.retry_for_mapping(mapping, self.request.user)

    @action(detail=False, methods=['get'], url_path='unmapped-codes')
    def unmapped_codes(self, request):
        """
        Codes this analyzer has sent that are waiting for a mapping, with the
        last value seen, so the lab can map them without guessing what the
        analyzer calls things.
        """
        equipment = get_object_or_404(LabEquipment, pk=request.query_params.get('equipment'))
        rows = (AnalyzerResult.objects
                .filter(message__equipment=equipment, status=AnalyzerResult.Status.UNMAPPED)
                .values('analyzer_code')
                .annotate(count=Count('id'), last_seen=Max('message__received_at'))
                .order_by('analyzer_code'))
        mapped = {code.lower() for code in equipment.test_mappings.values_list('analyzer_code', flat=True)}
        codes = []
        for row in rows:
            if row['analyzer_code'].lower() in mapped:
                continue
            last = (AnalyzerResult.objects
                    .filter(message__equipment=equipment, analyzer_code=row['analyzer_code'])
                    .order_by('-message__received_at').values('value', 'unit').first())
            codes.append({**row, 'last_value': last['value'], 'unit': last['unit']})
        return Response(codes)
