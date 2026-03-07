import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container } from "@mui/material";
import AuthGuard from "@/assets/hoc/auth-guard";
import NursePatientDataGrid from '@/components/dashboard/nursing-station';
import ProtectedRoute from "@/assets/hoc/protected-route";
import NursingNav from '@/components/dashboard/nursing-station/NursingNav';


const NursingInterface = () => {
  return (
    <Container maxWidth="xl mt-8">
      <NursingNav />
      <NursePatientDataGrid />
    </Container>
  );
};

NursingInterface.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_NURSING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default NursingInterface;
