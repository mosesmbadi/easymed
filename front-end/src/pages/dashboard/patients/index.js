import PatientDataGrid from "@/components/dashboard/patient/patient-data-grid";
import { Container } from "@mui/material";
import React from "react";
import CustomizedLayout from "@/components/layout/customized-layout";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import ProtectedRoute from "@/assets/hoc/protected-route";

const Patient = () => {
  
  return (
    <Container maxWidth="xl">
      <PatientDataGrid />
    </Container>
  );
};

Patient.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_PATIENTS_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default Patient;
