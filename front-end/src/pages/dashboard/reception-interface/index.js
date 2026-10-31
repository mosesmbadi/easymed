import React from "react";
import CustomizedLayout from "@/components/layout/customized-layout";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container } from "@mui/material";
import PatientAppointmentDataGrid from "@/components/dashboard/reception-interface/patient-appointment-datagrid";
import AuthGuard from "@/assets/hoc/auth-guard";
import { useVisitQueue } from "@/assets/hooks/use-visit-queue";
import ServerPager from "@/components/common/ServerPager";
import ProtectedRoute from "@/assets/hoc/protected-route";

const ReceptionInterface = () => {
  // Every visit, newest first, a page at a time. (This read `store.patients`,
  // which doesn't exist, so the list was always empty.)
  const queue = useVisitQueue({});

  return (
    <Container maxWidth="xl" className="mt-8">
      <PatientAppointmentDataGrid
        patientAppointments={queue.rows}
        loading={queue.loading}
        footer={
          <ServerPager
            page={queue.page}
            pageSize={queue.pageSize}
            total={queue.total}
            loading={queue.loading}
            onPageChange={queue.setPage}
            onPageSizeChange={queue.setPageSize}
          />
        }
      />
    </Container>
  );
};

ReceptionInterface.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_RECEPTION_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default ReceptionInterface;
