import React from 'react';
import { Container, Typography } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import AccountsReceivableNav from '@/components/dashboard/finance/AccountsReceivableNav';

const OverdueInvoices = () => {
  return (
    <Container maxWidth='xl' className='my-8'>
      <AccountsReceivableNav />
      <Typography variant='h5' gutterBottom>Overdue Invoices</Typography>
      <Typography variant='body1'>Future implementation: aging buckets, dunning notices, and follow-up task queue.</Typography>
    </Container>
  );
};

OverdueInvoices.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default OverdueInvoices;
