import React, { useState, useEffect } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container, Grid, Paper } from "@mui/material";
import AuthGuard from "@/assets/hoc/auth-guard";
import PharmacyDataGrid from "@/components/dashboard/pharmacy";
import { pharmacyDisplayStats } from "@/assets/menu";
import PhamarcyNav from "@/components/dashboard/pharmacy/PhamarcyNav";
import PharmacyDashboardCards from "@/components/dashboard/pharmacy/PharmacyDashboardCards";
import ProtectedRoute from "@/assets/hoc/protected-route";


const Phamarcy = () => {
  const [currentTab, setCurrentTab] = useState(0);

  const columnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    textAlign: 'center',
    color: 'black',
    background: 'white',
    borderRadius: 10,
    height: '75px',
    gap: '20px',
  };

  const displayInformation = pharmacyDisplayStats.map((item, index) => {
    return (
      <Grid key={`pharmacy-display-info ${index}`} item xs={4}>
        <Paper style={columnStyle}>
          <img className="h-8 w-8" src={item.icon} alt=""></img>
          <div className="">
            <p>{item.label}</p>
            <p>{item.figures}</p>
          </div>
        </Paper>
      </Grid>
    )
  })

  return (
    <Container maxWidth="xl">
      <PhamarcyNav />
      <PharmacyDashboardCards />
      {/* <Grid container spacing={2}>
        {displayInformation}
      </Grid> */}
      <h3 className="text-2xl mt-12"> Prescriptions </h3>
      <PharmacyDataGrid />

    </Container>
  );

};

Phamarcy.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_PHARMACY_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default Phamarcy;

