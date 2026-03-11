import React from 'react';
import { Container } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AuthGuard from '@/assets/hoc/auth-guard';
import CashEquivalentsNav from '@/components/dashboard/finance/CashEquivalentsNav';
import AccountingSummaryDashboard from "@/components/dashboard/finance/cash-equivalents/AccountingSummaryDashboard";

const CashEquivalents = () => {
    return (
        <Container maxWidth="xl" className='my-8'>
            <CashEquivalentsNav />
            <section className="bg-white p-4 rounded shadow-md min-h-[400px]">
                <AccountingSummaryDashboard />
            </section>
        </Container>
    );
};

CashEquivalents.getLayout = (page) => (
    <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
        <AuthGuard>
            <DashboardLayout>{page}</DashboardLayout>
        </AuthGuard>
    </ProtectedRoute>
);

export default CashEquivalents;
