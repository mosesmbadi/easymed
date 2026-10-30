import React from 'react';
import { Container, Typography } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';

const FinanceDashboard = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <Typography variant='h5' gutterBottom>Finance Dashboard</Typography>
      <Typography variant='body1'>Select a sub-module (Accounts Receivable or Accounts Payable) from the sidebar to get started.</Typography>
    </Container>
  );
};

FinanceDashboard.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default FinanceDashboard;
