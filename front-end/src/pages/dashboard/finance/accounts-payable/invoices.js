import React from 'react';
import { Container, Box, Typography, Alert } from '@mui/material';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';

const APInvoicesPlaceholder = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <Box className='bg-white shadow p-6 rounded'>
        <Typography variant='h5' gutterBottom>Supplier Invoices</Typography>
        <Alert severity='info' className='mb-4'>Coming Soon!</Alert>
        <Typography variant='body2' paragraph>
          This screen will list supplier invoices with filters for All, Pending, and Paid. You will be able to search and drill into each invoice, mark as paid, and export aging data for reconciliation.
        </Typography>
        <Typography variant='subtitle2'>Planned Features:</Typography>
        <ul className='list-disc ml-6 text-sm'>
          <li>Status filter bar (All | Pending | Paid)</li>
          <li>Date range + supplier filter</li>
          <li>Inline paid marker & payment reference capture</li>
          <li>Export to CSV/PDF</li>
          <li>Link to Aging Statements and Make Payments workflow</li>
        </ul>
      </Box>
    </Container>
  );
};

APInvoicesPlaceholder.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APInvoicesPlaceholder;
