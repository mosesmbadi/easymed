import React from 'react';
import { Container, Typography } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import AccountsReceivableNav from '@/components/dashboard/finance/AccountsReceivableNav';

const ARReports = () => {
  return (
    <Container maxWidth='xl' className='my-8'>
      <AccountsReceivableNav />
      <Typography variant='h5' gutterBottom>Accounts Receivable Reports</Typography>
      <Typography variant='body1'>Future implementation: aging summary, cash forecast, collection effectiveness index, and sales vs collections trend.</Typography>
    </Container>
  );
};

ARReports.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default ARReports;
