import React from 'react'
import { Container } from '@mui/material';

import AuthGuard from '@/assets/hoc/auth-guard';
import ProtectedRoute from '@/assets/hoc/protected-route';
import PhamarcyNav from '@/components/dashboard/pharmacy/PhamarcyNav';
import DashboardLayout from '@/components/layout/dashboard-layout';
import InventoryDataGrid from '@/components/dashboard/inventory';

const PharmacyInventory = () => {
return (
    <Container maxWidth="xl">
      <PhamarcyNav/>
      <InventoryDataGrid department={'Pharmacy'}/>
    </Container>
  )
}

PharmacyInventory.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_PHARMACY_DASHBOARD'}>
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>;
    </AuthGuard>
  </ProtectedRoute>
);

export default PharmacyInventory