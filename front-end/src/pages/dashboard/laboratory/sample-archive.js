import React from "react";
import { Container } from "@mui/material";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import LabNav from "@/components/dashboard/laboratory/LabNav";
import ProtectedRoute from "@/assets/hoc/protected-route";
import SampleArchiveNav from "@/components/dashboard/laboratory/sample-archive/SampleArchiveNav";

const SampleArchive = () => {
    return (
        <Container maxWidth="xl">
            <LabNav />
            <SampleArchiveNav />
        </Container>
    );
};

SampleArchive.getLayout = (page) => (
    <ProtectedRoute permission={'CAN_ACCESS_LABORATORY_DASHBOARD'}>
        <AuthGuard>
            <DashboardLayout>{page}</DashboardLayout>
        </AuthGuard>
    </ProtectedRoute>
);

export default SampleArchive;
