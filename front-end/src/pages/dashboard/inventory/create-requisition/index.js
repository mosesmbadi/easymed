import React from 'react'
import { Container } from "@mui/material";
import InventoryNav from '@/components/dashboard/inventory/nav';
import AuthGuard from "@/assets/hoc/auth-guard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import CreateRequisition from '@/components/dashboard/inventory/CreateRequisition'

const CreateRequisitionPage = () => {
  return (
    <Container maxWidth="xl">
      <InventoryNav />
      <CreateRequisition />
    </Container>
  )
}

CreateRequisitionPage.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>;
  </AuthGuard>
);

export default CreateRequisitionPage