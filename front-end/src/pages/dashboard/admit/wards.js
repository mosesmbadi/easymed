import React from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container } from "@mui/material";
import AdmitNav from "@/components/dashboard/admit/AdmitNav";
import AuthGuard from "@/assets/hoc/auth-guard";

// Dynamically import Ward with SSR disabled
const Ward = dynamic(() => import("@/components/dashboard/admit/wards"), {
  ssr: false,
});

const Admit = () => {
  return (
    <Container maxWidth="xl" className="mt-8">
      <AdmitNav />
      <Ward />
    </Container>
  );
};

Admit.getLayout = (page) => (
  <AuthGuard>
    <DashboardLayout>{page}</DashboardLayout>
  </AuthGuard>
);

export default Admit;
