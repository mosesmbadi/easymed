import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Button, Box, Chip, Divider } from '@mui/material';
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { useAuth } from '@/assets/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AuthGuard from '@/assets/hoc/auth-guard';
import ProtectedRoute from '@/assets/hoc/protected-route';
import UnifiedCheckInForm from '@/components/dashboard/reception/UnifiedCheckInForm';
import CheckedInPatientsQueue from '@/components/dashboard/reception/CheckedInPatientsQueue';
import { refreshVisitQueues } from '@/redux/features/patients';
import { fetchVisitTrackCounts } from '@/redux/service/patients';
import { useVisitQueue } from '@/assets/hooks/use-visit-queue';
import ServerPager from '@/components/common/ServerPager';

const CheckInPage = () => {
  const dispatch = useDispatch();
  const auth = useAuth();
  const { visitQueueVersion } = useSelector((store) => store.patient);
  // Checked in: still at reception or waiting for triage. A page at a time.
  const queue = useVisitQueue({ track__in: 'reception,triage' }, { pageSize: 20 });
  // Headcounts per track for the cards below, counted on the server.
  const [trackCounts, setTrackCounts] = useState({});
  const countOf = (track) => trackCounts[track] || 0;

  useEffect(() => {
    if (!auth) return;
    fetchVisitTrackCounts(auth).then(setTrackCounts).catch(() => setTrackCounts({}));
  }, [auth, visitQueueVersion]);

  const handleCheckInSuccess = () => {
    dispatch(refreshVisitQueues());
    toast.success('Patient checked in successfully!');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#1976d2' }}>
        Patient Check-In
      </Typography>

      <Grid container spacing={3}>
        {/* Check-In Form Section */}
        <Grid item xs={12} lg={5}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                Register & Check-In
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <UnifiedCheckInForm onSuccess={handleCheckInSuccess} />
            </CardContent>
          </Card>
        </Grid>

        {/* Checked-In Patients Queue */}
        <Grid item xs={12} lg={7}>
          <Card elevation={3} sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Checked-In Patients Queue
                </Typography>
                <Chip 
                  label={`${queue.total} Patients`} 
                  color="primary" 
                  size="small"
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <CheckedInPatientsQueue 
                processes={queue.rows}
                loading={queue.loading}
                rowOffset={(queue.page - 1) * queue.pageSize}
                onUpdate={handleCheckInSuccess}
              />
              <ServerPager
                page={queue.page}
                pageSize={queue.pageSize}
                total={queue.total}
                loading={queue.loading}
                onPageChange={queue.setPage}
                onPageSizeChange={queue.setPageSize}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd', textAlign: 'center', p: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              {countOf('reception') + countOf('triage')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Waiting Patients
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#f3e5f5', textAlign: 'center', p: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
              {countOf('doctor')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              With Doctor
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9', textAlign: 'center', p: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#388e3c' }}>
              {countOf('lab')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In Lab
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0', textAlign: 'center', p: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
              {countOf('pharmacy')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In Pharmacy
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

CheckInPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_RECEPTION_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default CheckInPage;
