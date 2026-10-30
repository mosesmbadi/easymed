import React, { useEffect, useContext, useState } from "react";
import { useRouter } from "next/router";
import { getPatientProfile } from "@/redux/features/patients";
import { getCurrentUser } from "@/redux/features/users";
import { useDispatch, useSelector } from "react-redux";
import { Container, Grid } from "@mui/material";
import AuthGuard from "@/assets/hoc/auth-guard";
import ProfileLayout from "@/components/layout/profile-layout";
import { BsArrowLeft } from "react-icons/bs";
import Link from "next/link";
import { useAuth } from "@/assets/hooks/use-auth";
import PersonalDetails from "@/components/patient-profile/personal-details";
import { TbLogout2 } from "react-icons/tb";
import { authContext } from "@/components/use-context";
import { FaUserCircle } from "react-icons/fa";
import BookAppointmentModal from "./book-appointment-modal";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { IoChevronDownOutline } from "react-icons/io5";
import LabServiceModal from "./lab-service-modal";
import PatientHero from "@/components/patient-profile/overview/PatientHero";
import OverviewNav from "@/components/patient-profile/overview/OverviewNav";
import UpcomingAppointments from "@/components/patient-profile/appointments/upcoming-appointments";
import MyPrescriptions from "@/components/patient-profile/prescriptions/MyPrescriptions";
import CalenderDate from "@/components/layout/rightbar/calender";
import PersonalisedDatedAppointments from "@/components/patient-profile/appointments/PersonalisedDatedAppointments";
import { getAllPatients } from "@/redux/features/patients";
import PatientConfirmedProtect from "@/assets/hoc/patient-confirmed";

const PatientProfile = () => {
  const dispatch = useDispatch();
  const { userProfile } = useSelector((store) => store.user);
  const { appointmentsByPatientsId } = useSelector((store) => store.appointment);
  const { patients } = useSelector((store) => store.patient);
  const auth = useAuth();
  const loggedInPatient = patients.find((patient)=> patient.user === auth?.user_id)

  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const upcomingAppointments = appointmentsByPatientsId.
    filter((appointment) => new Date(appointment.appointment_date_time) >= new Date())
    .sort((a, b) => new Date(a.appointment_date_time) - new Date(b.appointment_date_time));
  



  console.log("LOGGED IN PATIENT", loggedInPatient)
  console.log("ALL THE PATIENTS", patients)

  const router = useRouter();

  useEffect(() => {
    if (auth) {
      dispatch(getCurrentUser(auth));
      dispatch(getAllPatients(auth));
    }
  }, [auth]);

  return (
    <AuthGuard>
      <Container className="">
        <OverviewNav/>
        <PatientHero loggedInPatient={loggedInPatient}/>
        <Grid className="my-4" container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
          <Grid className="" item md={8} xs={12}>
              <UpcomingAppointments appointmentsByPatientsId={appointmentsByPatientsId} appointments={upcomingAppointments} patient = {loggedInPatient}/>
          </Grid>
          <Grid item md={4} xs={12}>
            <div className="w-full h-full flex flex-col gap-2">
              <CalenderDate/>
              <PersonalisedDatedAppointments upcomingAppointments={upcomingAppointments}/>
            </div>
          </Grid>
        </Grid>
        <MyPrescriptions patient = {loggedInPatient}/>
      </Container>
    </AuthGuard>
  );
};

PatientProfile.getLayout = (page) => (
  <PatientConfirmedProtect>
    <ProfileLayout>{page}</ProfileLayout>
  </PatientConfirmedProtect>
);

export default PatientProfile;
