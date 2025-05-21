import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container } from "@mui/material";
import AdmitNav from "@/components/dashboard/admit/AdmitNav";
import AuthGuard from "@/assets/hoc/auth-guard";
import NewWard from "@/components/dashboard/admit/ward/Ward";
// import ProtectedRoute from "@/assets/hoc/protected-route";

const Ward = () => {
    return (
        <Container maxWidth="xl" className="mt-8">
            <AdmitNav />
            <NewWard/>
        </Container>
    );
};

Ward.getLayout = (page) => (
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
    //   <ProtectedRoute permission={'CAN_ACCESS_DOCTOR_DASHBOARD'}>
    //   </ProtectedRoute>
);

export default Ward;