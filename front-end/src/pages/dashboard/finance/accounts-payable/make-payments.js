import React from 'react';
import { Container, Box, Typography, Alert } from '@mui/material';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';

const APMakePaymentsPlaceholder = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <Box className='bg-white shadow p-6 rounded'>
        <Typography variant='h5' gutterBottom>Make Payments</Typography>
        <Alert severity='info' className='mb-4'>Coming Soon!</Alert>
        <Typography variant='body2' paragraph>
          This workflow will let you select outstanding supplier invoices, allocate payment amounts, capture payment method & reference, and post settlements.
        </Typography>
        <Typography variant='subtitle2'>Planned Features:</Typography>
        <ul className='list-disc ml-6 text-sm'>
          <li>Select supplier and view unpaid invoices</li>
          <li>Bulk select & partial allocation support</li>
          <li>Record payment method (Cash, Bank, Mobile Money, Cheque)</li>
          <li>Auto-generate payment reference and printable remittance advice</li>
          <li>Update invoice statuses + aging recalculation</li>
        </ul>
      </Box>
    </Container>
  );
};

APMakePaymentsPlaceholder.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APMakePaymentsPlaceholder;
