import React from 'react'
import { Container } from "@mui/material";
import InventoryNav from '@/components/dashboard/inventory/nav';
import AuthGuard from "@/assets/hoc/auth-guard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import StockMovements from '@/components/dashboard/inventory/stock-movements';

const StockMovementsPage = () => {
  return (
    <Container maxWidth="xl">
      <InventoryNav />
      <StockMovements />
    </Container>
  );
};

StockMovementsPage.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>
  </AuthGuard>
);

export default StockMovementsPage;
