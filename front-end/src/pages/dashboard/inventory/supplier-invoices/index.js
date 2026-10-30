import React from 'react'
import { Container } from "@mui/material";
import InventoryNav from '@/components/dashboard/inventory/nav';
import AuthGuard from "@/assets/hoc/auth-guard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import SupplierInvoices from '@/components/dashboard/inventory/supplier-invoices';

const SupplierInvoicesPage = () => {
  return (
    <Container maxWidth="xl">
      <InventoryNav />
      <SupplierInvoices />
    </Container>
  );
};

SupplierInvoicesPage.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>
  </AuthGuard>
);

export default SupplierInvoicesPage;




