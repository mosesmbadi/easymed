import React from 'react';
import { Container, Typography } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';

const AccountsPayable = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <Typography variant='h5' gutterBottom>Accounts Payable</Typography>
      <Typography variant='body1'>Future implementation: vendor bills, payment run queue, due date analysis, and expense accruals.</Typography>
    </Container>
  );
};

AccountsPayable.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default AccountsPayable;
