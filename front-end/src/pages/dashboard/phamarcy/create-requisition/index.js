import React from 'react'
import { Container } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';

import AuthGuard from '@/assets/hoc/auth-guard';
import CreateRequisition from '@/components/dashboard/inventory/CreateRequisition';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PhamarcyNav from '@/components/dashboard/pharmacy/PhamarcyNav';
import ProtectedRoute from '@/assets/hoc/protected-route';

const PharmacyRequisition = () => {
    const router = useRouter();
    const pathName = router.pathname
  return (
    <Container maxWidth="xl">
        <PhamarcyNav/>
        <CreateRequisition />
    </Container>
  )
}

PharmacyRequisition.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_PHARMACY_DASHBOARD'}>
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>;
    </AuthGuard>
  </ProtectedRoute>
);

export default PharmacyRequisition;