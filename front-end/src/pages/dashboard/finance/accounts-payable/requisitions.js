import React from 'react';
import { Container } from '@mui/material';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import RequisitionDatagrid from '@/components/dashboard/inventory/RequisitionDatagrid';

const APRequisitionsPage = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <RequisitionDatagrid />
    </Container>
  );
};

APRequisitionsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APRequisitionsPage;
