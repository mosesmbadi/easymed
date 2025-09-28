import React from "react";
import CustomizedLayout from "@/components/layout/customized-layout";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container } from "@mui/material";
import PatientAppointmentDataGrid from "@/components/dashboard/reception-interface/patient-appointment-datagrid";
import AuthGuard from "@/assets/hoc/auth-guard";
import { getAllProcesses } from "@/redux/features/patients";
import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import ProtectedRoute from "@/assets/hoc/protected-route";
import { useAuth } from "@/assets/hooks/use-auth";

const ReceptionInterface = () => {
  const { processes } = useSelector(( store ) => store.patients)
  const dispatch = useDispatch();
  const auth = useAuth();

  useEffect(() =>{
    console.log("RECEPTION: Dispatching getAllProcesses with auth:", auth);
    dispatch(getAllProcesses(auth));
  },[]);

  console.log("RECEPTION: Current processes from Redux:", processes);


  return (
    <Container maxWidth="xl" className="mt-8">
      <PatientAppointmentDataGrid patientAppointments={processes} />
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
