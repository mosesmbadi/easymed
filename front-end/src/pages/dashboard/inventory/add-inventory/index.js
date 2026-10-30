import React from 'react'
import { Container } from "@mui/material";
import InventoryNav from '@/components/dashboard/inventory/nav';
import AuthGuard from "@/assets/hoc/auth-guard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AddInventory from '@/components/dashboard/inventory/AddInventory'

const AddInventoryPage = () => {
  return (
    <Container maxWidth="xl">
        <InventoryNav />
        <AddInventory />
    </Container>
  )
}

AddInventoryPage.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>;
  </AuthGuard>
);

export default AddInventoryPage