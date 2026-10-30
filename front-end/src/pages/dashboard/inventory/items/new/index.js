import React from 'react'
import { Container } from '@mui/material';

import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import InventoryNav from '@/components/dashboard/inventory/nav';
import NewItem from '@/components/dashboard/inventory/item/Item';


const NewItems = () => {
  return (
    <Container maxWidth="xl">
        <InventoryNav />
        <NewItem/>
    </Container>
  )
}


NewItems.getLayout = (page) => (
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>;
    </AuthGuard>
);

export default NewItems