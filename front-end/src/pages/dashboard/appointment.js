import React, { useEffect, useState } from 'react';
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  CircularProgress,
  Box,
  Alert,
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { getAllAppointments, removeAppointment } from '@/redux/features/appointment';
import { useRouter } from 'next/router';
import DashboardLayout from '@/components/layout/dashboard-layout';
import CreateAppointmentModal from '@/components/dashboard/patient/create-appointment-modal';
import RescheduleModal from '@/components/dashboard/patient/RescheduleModal';

const AppointmentsPage = () => {
  const dispatch = useDispatch();
  const { appointments, loading } = useSelector((state) => state.appointment);
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [formattedAppointments, setFormattedAppointments] = useState([]);

  const [newVisitOpen, setNewVisitOpen] = useState(false);
  const [selectedPatientForVisit, setSelectedPatientForVisit] = useState(null);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  useEffect(() => {
    dispatch(getAllAppointments());
  }, [dispatch]);

  useEffect(() => {
    if (!Array.isArray(appointments)) {
      setFormattedAppointments([]);
      return;
    }
    const formatted = appointments.map(apt => {
      let dateDisplay = 'N/A';
      try {
        if (apt?.appointment_date) {
          const d = new Date(apt.appointment_date);
          dateDisplay = isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleString();
        }
      } catch (e) {
        console.error('Error formatting date for appointment', apt?.id, e);
        dateDisplay = 'Error';
      }
      return { ...apt, formattedDate: dateDisplay };
    });
    setFormattedAppointments(formatted);
  }, [appointments]);

  const handleMenuOpen = (event, appointment) => {
    setAnchorEl(event.currentTarget);
    setSelectedAppointment(appointment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAppointment(null);
  };

  const handleNewVisit = () => {
    if (selectedAppointment?.patient) {
      const nameParts = (selectedAppointment.patient_name || '').split(' ');
      const patientData = {
        id: selectedAppointment.patient,
        first_name: nameParts[0] || '',
        second_name: nameParts.slice(1).join(' ') || '',
      };
      setSelectedPatientForVisit(patientData);
      setNewVisitOpen(true);
    }
    handleMenuClose();
  };

  const handleReschedule = () => {
    if (selectedAppointment) {
      setRescheduleOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedAppointment?.id) {
      await dispatch(removeAppointment(selectedAppointment.id));
      handleMenuClose();
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!Array.isArray(appointments)) {
    return (
      <Container maxWidth="xl">
        <h2 className="text-2xl py-2">Appointments</h2>
        <Alert severity="info">No appointment data available.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <h2 className="text-2xl py-2">Appointments</h2>
      <hr className="h-px mb-8 bg-gray-200" />
      <Button
        variant="contained"
        sx={{ mb: 2 }}
        onClick={() => router.push('/dashboard/patients')}
      >
        Book New Appointment
      </Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Patient ID</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Doctor</TableCell>
              <TableCell>Specialty</TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {formattedAppointments.map((apt, index) => (
              <TableRow key={apt.id || index}>
                <TableCell>{apt.patient_unique_id || apt.patient || 'N/A'}</TableCell>
                <TableCell>{apt.patient_name || 'N/A'}</TableCell>
                <TableCell>{apt.doctor_name || 'N/A'}</TableCell>
                <TableCell>{apt.doctor_specialty || 'N/A'}</TableCell>
                <TableCell>{apt.formattedDate}</TableCell>
                <TableCell>
                  <Chip
                    label={apt.status || 'unknown'}
                    color={apt.status === 'scheduled' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={(e) => handleMenuOpen(e, apt)}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleNewVisit}>New Visit</MenuItem>
        <MenuItem onClick={handleReschedule}>Reschedule</MenuItem>
        <MenuItem onClick={handleDelete}>Delete</MenuItem>
      </Menu>

      {newVisitOpen && (
        <CreateAppointmentModal
          open={newVisitOpen}
          setOpen={setNewVisitOpen}
          selectedRowData={selectedPatientForVisit}
        />
      )}
      {rescheduleOpen && selectedAppointment && (
        <RescheduleModal
          open={rescheduleOpen}
          setOpen={setRescheduleOpen}
          appointment={selectedAppointment}
        />
      )}
    </Container>
  );
};

AppointmentsPage.getLayout = (page) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default AppointmentsPage;