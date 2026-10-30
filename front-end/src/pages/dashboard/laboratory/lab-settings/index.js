import React from 'react';
import { Container } from '@mui/material';

import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import LabNav from '@/components/dashboard/laboratory/LabNav';
import ProtectedRoute from '@/assets/hoc/protected-route';
import LabSettings from '@/components/dashboard/laboratory/lab-settings/LabSettings';

const LabSettingsPage = () => {
  return (
    <Container>
      <LabNav/>
      <LabSettings />
    </Container>
    
  )
}

LabSettingsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_LABORATORY_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default LabSettingsPage;