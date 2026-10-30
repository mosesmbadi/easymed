import React from 'react';
import { Container, Box, Typography, Alert } from '@mui/material';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';

const APAgingStatementsPlaceholder = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <Box className='bg-white shadow p-6 rounded'>
        <Typography variant='h5' gutterBottom>Aging Statements</Typography>
        <Alert severity='info' className='mb-4'>Coming Soon!</Alert>
        <Typography variant='body2' paragraph>
          This screen will generate supplier aging statements (30 / 60 / 90 / 120+ day buckets) to support cash flow planning and reconciliation.
        </Typography>
        <Typography variant='subtitle2'>Planned Features:</Typography>
        <ul className='list-disc ml-6 text-sm'>
          <li>Generate aging by supplier or all suppliers</li>
          <li>Drill-down to underlying invoices</li>
          <li>Export to CSV/PDF</li>
          <li>Integration link to Make Payments workflow</li>
          <li>Snapshot date selector</li>
        </ul>
      </Box>
    </Container>
  );
};

APAgingStatementsPlaceholder.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APAgingStatementsPlaceholder;
