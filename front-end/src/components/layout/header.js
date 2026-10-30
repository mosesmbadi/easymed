import { Container, Grid } from "@mui/material";
import React, { useState } from "react";
import TopSection from "./rightbar/top-section";
import AddPatientModal from "../dashboard/patient/add-patient-modal";
import { AiOutlineMenu } from "react-icons/ai";
import { Drawer } from "@/assets/drawer";
import Link from "next/link";
import { AdminData as adminData } from '@/assets/menu'
import DashboardCards from "../dashboard/dashboard-cards";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const dashboardCards = adminData().map((data, index)=> <DashboardCards dashData={data} index={index} key={`dashboard-card-${index}`}/>)


  return (
    <>
      <Drawer {...{ isOpen, setIsOpen }} />
      <section className="sticky top-0 py-2 md:p-0 bg-white h-[10vh] md:h-[15vh] shadow-sm mb-12">
        <Container maxWidth="xl">
          <section className="flex items-center justify-between gap-4">
            <div className="md:hidden block bg-red">
              <AiOutlineMenu
                className="text-2xl text-white cursor-pointer"
                onClick={() => setIsOpen(true)}
              />
            </div>

            <Grid container spacing={1} className="my-2 hidden md:block">
              <Grid container spacing={2}>
                {dashboardCards}
              </Grid>
            </Grid>

            <div className="md:hidden block">
              <TopSection />
            </div>
          </section>
        </Container>
      </section>
    </>
  );
};

export default Header;
