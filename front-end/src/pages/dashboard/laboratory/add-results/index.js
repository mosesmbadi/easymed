import React from 'react';
import { Container } from '@mui/material';

import AuthGuard from '@/assets/hoc/auth-guard';
import AddTestResults from '@/components/dashboard/laboratory/add-result/AddTestResults';
import DashboardLayout from '@/components/layout/dashboard-layout';
import LabNav from '@/components/dashboard/laboratory/LabNav';
import ProtectedRoute from '@/assets/hoc/protected-route';

const AddTestResultsPage = () => {
  return (
    <Container>
      <LabNav/>
      <AddTestResults />
    </Container>
    
  )
}

AddTestResultsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_LABORATORY_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default AddTestResultsPage;