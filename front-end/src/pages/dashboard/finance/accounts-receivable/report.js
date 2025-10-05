import React, { useEffect } from 'react';
import { Container } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import AccountsReceivableNav from '@/components/dashboard/finance/AccountsReceivableNav';
import Reports from '@/components/dashboard/billing/reports/Reports';
import { useDispatch } from 'react-redux';
import { getAllItems } from '@/redux/features/inventory';
import { useAuth } from '@/assets/hooks/use-auth';

const ARReports = () => {
  const dispatch = useDispatch();
  const auth = useAuth();
  useEffect(() => {
    if (auth.token) {
      dispatch(getAllItems(auth));
    }
  }, [auth]);

  return (
    <Container maxWidth='xl' className='my-8'>
      <AccountsReceivableNav />
      <Reports />
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
