from unittest import mock
import pytest
from unittest.mock import AsyncMock, patch, call
from patient.models import AttendanceProcess
from patient.signals import doctor_assigned_signal, appointment_assign_notification

@pytest.fixture
def attendance_process(db, user, patient):
    return AttendanceProcess.objects.create(
        doctor=None,
        track_number="TRK12345",
        patient=patient,
        reason="Test reason",
        created_by=user,
    )

@pytest.mark.django_db
@patch("patient.signals.get_channel_layer")
def test_appointment_assign_notification(mock_get_channel_layer, attendance_process, doctor):
    '''
    We use get_channel_layer in the signal to send the notification
    So we mock it here..
    '''
    mock_channel_layer = mock_get_channel_layer.return_value
    mock_channel_layer.group_send = AsyncMock()

    attendance_process.doctor = doctor
    attendance_process.save()

    #group_send is a method used to send a message to a group of connected WebSocket clients or consumers.
    mock_channel_layer.group_send.assert_called_once_with(
        "doctor_notifications",
        mock.ANY
    )

    actual_call = mock_channel_layer.group_send.call_args
    actual_args, actual_kwargs = actual_call

    assert actual_args[0] == "doctor_notifications"
    assert actual_args[1]["type"] == "send_notification"
    assert attendance_process.track_number in actual_args[1]["message"]


@pytest.mark.django_db
def test_doctor_assigned_signal(mocker, attendance_process,doctor):
    mocked_notification = mocker.patch("patient.signals.appointment_assign_notification")
    attendance_process.doctor = doctor
    attendance_process.save()

    mocked_notification.assert_called_once_with(attendance_process.id)
