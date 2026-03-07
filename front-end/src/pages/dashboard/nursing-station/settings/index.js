import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import ProtectedRoute from "@/assets/hoc/protected-route";
import TriageSettingsForm from "@/components/dashboard/nursing-station/settings/TriageSettingsForm";
import NursingNav from "@/components/dashboard/nursing-station/NursingNav";
import { Container } from "@mui/material";

const NursingStationSettings = () => {
    return (
        <Container maxWidth="xl mt-8">
            <NursingNav />
            <div className="bg-white p-4 sm:p-6 mb-4 rounded shadow">
                <h1 className="text-2xl font-bold mb-6">Nursing Station Settings</h1>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <TriageSettingsForm />
                </div>
            </div>
        </Container>
    );
};

NursingStationSettings.getLayout = (page) => (
    <ProtectedRoute permission={'CAN_ACCESS_NURSING_DASHBOARD'}>
        <AuthGuard>
            <DashboardLayout>{page}</DashboardLayout>
        </AuthGuard>
    </ProtectedRoute>
);

export default NursingStationSettings;
