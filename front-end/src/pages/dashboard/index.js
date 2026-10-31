import React, { useEffect } from "react";
import { Container } from "@mui/material";
import { useDispatch, useSelector } from 'react-redux'

import DashboardLayout from "@/components/layout/dashboard-layout";
import AuthGuard from "@/assets/hoc/auth-guard";
import ProtectedRoute from "@/assets/hoc/protected-route";
import AppointmentCard from "@/components/dashboard/cards/AppointmentCard";
import { getAllProcesses } from "@/redux/features/patients";
import { useAuth } from "@/assets/hooks/use-auth";
import { useFacility } from "@/assets/hooks/use-facility";
import Link from "next/link";

// A standalone lab has no visits to send to a doctor; its day runs from the
// counter to the bench to the report.
const labShortcuts = [
  { href: "/dashboard/laboratory/walk-in", label: "New Walk-in", hint: "Register the patient and order their tests" },
  { href: "/dashboard/laboratory/receive-samples", label: "Receive Samples", hint: "Book in samples another facility sent" },
  { href: "/dashboard/finance/accounts-receivable/invoices", label: "Take Payment", hint: "Bill the tests so the bench can run them" },
  { href: "/dashboard/laboratory", label: "Phlebotomy", hint: "Collect samples for paid tests" },
  { href: "/dashboard/laboratory/lab-results", label: "Lab Results", hint: "Enter, approve and print results" },
];

const LabHome = () => (
  <section className="grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-4">
    {labShortcuts.map((shortcut) => (
      <Link key={shortcut.href} href={shortcut.href} className="bg-white rounded shadow p-4 hover:shadow-lg">
        <p className="font-semibold">{shortcut.label}</p>
        <p className="text-xs mt-1">{shortcut.hint}</p>
      </Link>
    ))}
  </section>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const auth = useAuth()
  const { processes } = useSelector((store)=>store.patient);
  const { settled, isLabFirst } = useFacility();

  useEffect(()=>{
      dispatch(getAllProcesses(auth))
  },[])

  if (!settled) return null;

  return (
    <Container maxWidth="xl">
      <h2 className="text-2xl py-2">{isLabFirst ? "Laboratory" : "New Visits"}</h2>
      <hr class="h-px mb-8 bg-gray border-0 dark:bg-gray"></hr>

      {isLabFirst ? <LabHome /> : <AppointmentCard />}
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
