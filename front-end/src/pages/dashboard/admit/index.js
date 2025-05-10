import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container } from "@mui/material";
import AdmitNav from "@/components/dashboard/admit/AdmitNav";
import AdmitPatientDataGrid from "@/components/dashboard/admit/admit-patient-datagrid";
import AuthGuard from "@/assets/hoc/auth-guard";
// import ProtectedRoute from "@/assets/hoc/protected-route";

const Admit = () => {
    return (
        <Container maxWidth="xl" className="mt-8">
            <AdmitNav />
            <AdmitPatientDataGrid />
        </Container>
    );
};

Admit.getLayout = (page) => (
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
    //   <ProtectedRoute permission={'CAN_ACCESS_DOCTOR_DASHBOARD'}>
    //   </ProtectedRoute>
);

export default Admit;
