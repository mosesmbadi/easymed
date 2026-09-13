import React from 'react'
import { Container } from "@mui/material";
import InventoryNav from '@/components/dashboard/inventory/nav';
import AuthGuard from "@/assets/hoc/auth-guard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import Reports from '@/components/dashboard/billing/reports/Reports';
import GrossMarginReport from '@/components/dashboard/inventory/GrossMarginReport';

const ReportsPage = () => {
  return (
    <Container maxWidth="xl">
      <InventoryNav />
      <GrossMarginReport />
      <Reports/>
    </Container>

  )
}

ReportsPage.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>;
  </AuthGuard>
);

export default ReportsPage