import React, { useEffect } from 'react';
import { Container } from '@mui/material';
import { useDispatch } from 'react-redux';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import AccountsReceivableNav from '@/components/dashboard/finance/AccountsReceivableNav';
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllItems } from '@/redux/features/inventory';
import InvoicePayModal from '@/components/dashboard/billing/invoicePayModal';
import PaymentReceiptsList from '@/components/dashboard/billing/PaymentReceiptsList';

const AccountsReceivablePayments = () => {
  const dispatch = useDispatch();
  const auth = useAuth();

  useEffect(() => {
    if (auth) {
      dispatch(getAllItems(auth));
    }
  }, [auth, dispatch]);

  return (
    <Container maxWidth='xl' className='my-8'>
      <AccountsReceivableNav active='payments' />
      <InvoicePayModal />
      <PaymentReceiptsList />
    </Container>
  );
};

AccountsReceivablePayments.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default AccountsReceivablePayments;
