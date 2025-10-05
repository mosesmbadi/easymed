import React from 'react';
import { Container } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import AccountsReceivableNav from '@/components/dashboard/finance/AccountsReceivableNav';
import BillingSettings from '@/components/dashboard/billing/billing-settings/billingSettings';

const ARSettings = () => (
  <Container maxWidth='xl' className='my-8'>
    <AccountsReceivableNav />
    <BillingSettings />
  </Container>
);

ARSettings.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default ARSettings;
