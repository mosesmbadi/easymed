import React from 'react'
import { Container } from "@mui/material";
import InventoryNav from '@/components/dashboard/inventory/nav';
import AuthGuard from "@/assets/hoc/auth-guard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ItemsGrid from '@/components/dashboard/inventory/item/Itemgrid';


const ItemsPage = () => {
  return (
    <Container maxWidth="xl">
      <InventoryNav />
      <ItemsGrid />
    </Container>
    
  )
}

ItemsPage.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>;
  </AuthGuard>
);

export default ItemsPage