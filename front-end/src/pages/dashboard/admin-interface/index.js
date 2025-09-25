import React, { useState } from "react";
import CustomizedLayout from "@/components/layout/customized-layout";
import { Container } from "@mui/material";

import AuthGuard from "@/assets/hoc/auth-guard";
import ProtectedRoute from "@/assets/hoc/protected-route";
import MembersNav from "@/components/dashboard/admin-interface/members/MembersNav";
import MainSettingsNav from "@/components/dashboard/admin-interface/members/MainSettingsNav";
import CompanyDetails from "@/components/dashboard/admin-interface/company/CompanyDetails";
import Permissions from "@/components/dashboard/admin-interface/permissions/Permissions";
import Channels from "@/components/dashboard/admin-interface/announcements/channels";

const Admin = () => {
  const [ selectedRoute, setSelectedRoute ] = useState("members")

  return (
    <Container maxWidth="xl" className="py-2">
      <MainSettingsNav setSelectedRoute= {setSelectedRoute} selectedRoute={selectedRoute} />
      {selectedRoute === "members" && <MembersNav/>}
      {selectedRoute === "company" && <CompanyDetails/>}
      {selectedRoute === "announcements" && <Channels/>}
    </Container>
  );
};
Admin.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_ADMIN_DASHBOARD'}>
    <AuthGuard>
      <CustomizedLayout>{page}</CustomizedLayout>
    </AuthGuard> 
  </ProtectedRoute> 
);

export default Admin;
