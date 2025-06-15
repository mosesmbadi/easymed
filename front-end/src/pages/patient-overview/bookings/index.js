import React, { useEffect } from 'react'
import { Container, Box, Typography } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';

import { useAuth } from '@/assets/hooks/use-auth';
import AuthGuard from '@/assets/hoc/auth-guard';
import PatientConfirmedProtect from '@/assets/hoc/patient-confirmed';
import ProfileLayout from '@/components/layout/profile-layout';
import UpcomingAppointments from '@/components/patient-profile/appointments/upcoming-appointments';
import AppointmentsCalendar from '@/components/patient-profile/appointments/AppointmentsCalendar';
import OverviewNav from '@/components/patient-profile/overview/OverviewNav';
import { getAllAppointmentsByPatientId } from '@/redux/features/appointment';

const PatientBookings = () => {
  const dispatch = useDispatch();
  const { appointmentsByPatientsId } = useSelector((store) => store.appointment);
  const { patients } = useSelector((store) => store.patient);
  const auth = useAuth();
  const loggedInPatient = patients.find((patient)=> patient.user === auth?.user_id)

  useEffect(() => {
    if (loggedInPatient?.id) {
      dispatch(getAllAppointmentsByPatientId(loggedInPatient.id));
    }
  }, [loggedInPatient]);

  return (
    <AuthGuard>
      <Container>
        <OverviewNav/>
        <Box sx={{ mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            My Appointments
          </Typography>
          <AppointmentsCalendar appointments={appointmentsByPatientsId} />
        </Box>
      </Container>
    </AuthGuard>
  )
}

PatientBookings.getLayout = (page) => (
  <PatientConfirmedProtect>
    <ProfileLayout>{page}</ProfileLayout>
  </PatientConfirmedProtect>
);

export default PatientBookings