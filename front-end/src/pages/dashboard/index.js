import React, { useEffect } from "react";
import { Container } from "@mui/material";
import { useDispatch, useSelector } from 'react-redux'

import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import ProtectedRoute from "@/assets/hoc/protected-route";
import AppointmentCard from "@/components/dashboard/cards/AppointmentCard";
import { getAllProcesses } from "@/redux/features/patients";
import { useAuth } from "@/assets/hooks/use-auth";

const Dashboard = () => {
  const dispatch = useDispatch();
  const auth = useAuth()
  const { processes } = useSelector((store)=>store.patient);

  useEffect(()=>{
      dispatch(getAllProcesses(auth))
  },[])

  return (
    <Container maxWidth="xl">
      <h2 className="text-2xl py-2">New Visits</h2>
      <hr class="h-px mb-8 bg-gray border-0 dark:bg-gray"></hr>

      <AppointmentCard />
    </Container>
  );
};

Dashboard.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_GENERAL_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default Dashboard;
