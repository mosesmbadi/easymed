import React from 'react';
import { Container } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import AccountsReceivableNav from '@/components/dashboard/finance/AccountsReceivableNav';
import NewInvoice from '@/pages/dashboard/billing/create-invoice/NewInvoice';

// Root of Accounts Receivable now shows the Bill Invoice (NewInvoice) workflow
const AccountsReceivable = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsReceivableNav />
      <NewInvoice />
    </Container>
  );
};

AccountsReceivable.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default AccountsReceivable;
