import React from 'react'
import { Container } from '@mui/material';
import Link from 'next/link';

import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PhamarcyNav from '@/components/dashboard/pharmacy/PhamarcyNav';
import NewInvoice from '../../billing/create-invoice/NewInvoice';
import ProtectedRoute from '@/assets/hoc/protected-route';

const PharmacyCreateInvoice = () => {
  return (
    <Container maxWidth="xl">
      <PhamarcyNav/>
      <NewInvoice/>
    </Container>
  )
}

PharmacyCreateInvoice.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_PHARMACY_DASHBOARD'}>
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>;
    </AuthGuard>
  </ProtectedRoute>
);

export default PharmacyCreateInvoice