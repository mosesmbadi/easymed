import React, { useEffect } from "react";
import { Container } from "@mui/material";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import { getAllPublicLabRequests } from "@/redux/features/laboratory";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import LabNav from "@/components/dashboard/laboratory/LabNav";
import PublicLabRequestDataGrid from "@/components/dashboard/laboratory/public-lab-requests-datagrid";
import ProtectedRoute from "@/assets/hoc/protected-route";

const PublicLabRequests = () => {
  const dispatch = useDispatch();
  const { publicLabRequests } = useSelector((store) => store.laboratory);

  console.log(publicLabRequests)

  const token = useAuth();

  useEffect(() => {
    if (token) {
      dispatch(getAllPublicLabRequests(token));
    }
  }, [token]);

  return (
    <Container maxWidth="xl">
      <LabNav/>
      <h1 className="uppercase text-lg my-3">Public Lab Requests</h1>
      <PublicLabRequestDataGrid publicLabRequests={publicLabRequests} />
    </Container>
  );
};

PublicLabRequests.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_LABORATORY_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default PublicLabRequests;