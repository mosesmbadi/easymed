import React from 'react';
import { Container } from '@mui/material';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import AddProductPurchase from '@/components/dashboard/inventory/AddProductPurchase';

// New Purchase Order creation page under Finance > Accounts Payable
// Reuses existing AddProductPurchase component (requisition -> PO flow)
// Provides back navigation to finance purchase orders list
const FinanceCreatePurchaseOrderPage = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <AddProductPurchase backPath={'/dashboard/finance/accounts-payable/purchase-orders'} />
    </Container>
  );
};

FinanceCreatePurchaseOrderPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default FinanceCreatePurchaseOrderPage;
