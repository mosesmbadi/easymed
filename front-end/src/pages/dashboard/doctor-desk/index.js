import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container } from "@mui/material";
import DoctorPatientDataGrid from "@/components/dashboard/doctor-desk/doctor-patient-datagrid";
import AuthGuard from "@/assets/hoc/auth-guard";
import ProtectedRoute from "@/assets/hoc/protected-route";

const DoctorInterface = () => {
  return (
    <Container maxWidth="xl" className="mt-8">
      <DoctorPatientDataGrid />
    </Container>
  );
};

DoctorInterface.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_DOCTOR_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default DoctorInterface;
