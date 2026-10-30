import React from 'react'
import { Container } from '@mui/material';

import LabNav from '@/components/dashboard/laboratory/LabNav';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import InventoryDataGrid from '@/components/dashboard/inventory';

const LaboratoryInventory = () => {

return (
    <Container>
      <LabNav/>
      <InventoryDataGrid department={'Lab'}/>
    </Container>
    
  )
}

LaboratoryInventory.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_LABORATORY_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default LaboratoryInventory