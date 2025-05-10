import React, { useEffect } from "react";
import Link from 'next/link'
import { Container } from "@mui/material";
import InventoryDataGrid from "@/components/dashboard/inventory";
import AuthGuard from "@/assets/hoc/auth-guard";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { getAllInventories } from "@/redux/features/inventory";
import { getAllOrderBills, getItems } from "@/redux/features/inventory";
import { useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import InventoryNav from "@/components/dashboard/inventory/nav";


const Inventory = () => {
  const dispatch = useDispatch()
  const auth = useAuth();


  useEffect(() => {
    if (auth.token) {
      dispatch(getAllInventories(auth));
      dispatch(getItems(auth))
    }
  }, [auth]);

  return (

      <div>
        <Container maxWidth="xl">
          <InventoryNav />
          <InventoryDataGrid />
        </Container>
        
      </div>

  );
};

Inventory.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>;
  </AuthGuard>
);

export default Inventory;
