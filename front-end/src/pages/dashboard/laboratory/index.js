import React, { useEffect } from "react";
import { Container } from "@mui/material";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import { useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import LabNav from "@/components/dashboard/laboratory/LabNav";
import ProtectedRoute from "@/assets/hoc/protected-route";
import LabRequestDataGrid from "@/components/dashboard/laboratory/lab-request-datagrid";
import RecentReagentUsage from "@/components/dashboard/laboratory/RecentReagentUsage";
import { getAllProcesses } from "@/redux/features/patients";
import { getAllLabEquipments } from "@/redux/features/laboratory";

const LabResults = () => {
  const dispatch = useDispatch();
  const token = useAuth();

  useEffect(() => {
    if (token) {
      dispatch(getAllProcesses(token))
      dispatch(getAllLabEquipments(token))
    }
  }, [token]);

  return (
    <Container maxWidth="xl">
      <LabNav/>
      <RecentReagentUsage />
      <div className="flex justify-between items-center my-4">
        <h1 className="uppercase text-2xl">Lab Requests</h1>
        <p className="text-gray-600 italic">Note: Only tests that have been billed are shown</p>
      </div>
      <LabRequestDataGrid />
    </Container>
  );
};

LabResults.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_LABORATORY_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default LabResults;
