import React from 'react'
import { Container } from '@mui/material';

import AuthGuard from '@/assets/hoc/auth-guard';
import ProtectedRoute from '@/assets/hoc/protected-route';
import PhamarcyNav from '@/components/dashboard/pharmacy/PhamarcyNav';
import DashboardLayout from '@/components/layout/dashboard-layout';
import PublicPrescriptionsDatagrid from '@/components/dashboard/pharmacy/public-prescriptions/PublicPrescriptionsDatagrid';

const PublicPrescriptions = () => {
  return (
    <Container maxWidth="xl">
        <PhamarcyNav/>
        <PublicPrescriptionsDatagrid/>
    </Container>
  )
}

PublicPrescriptions.getLayout = (page) => (
    <ProtectedRoute permission={'CAN_ACCESS_PHARMACY_DASHBOARD'}>
      <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
      </AuthGuard>
    </ProtectedRoute>
  );

export default PublicPrescriptions