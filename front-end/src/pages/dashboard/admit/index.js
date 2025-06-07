import React from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container } from "@mui/material";
import AdmitNav from "@/components/dashboard/admit/AdmitNav";
import AuthGuard from "@/assets/hoc/auth-guard";

// Dynamically import AdmitPatientDataGrid with SSR disabled
const AdmitPatientDataGrid = dynamic(
  () => import("@/components/dashboard/admit/admit-patient-datagrid"),
  { ssr: false }
);

const Admit = () => {
  return (
    <Container maxWidth="xl" className="mt-8">
      <AdmitNav />
      <AdmitPatientDataGrid />
    </Container>
  );
};

Admit.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>
  </AuthGuard>
);

export default Admit;
