import React from 'react'
import PatientConfirmedProtect from '@/assets/hoc/patient-confirmed';
import ProfileLayout from '@/components/layout/profile-layout';
import AuthGuard from '@/assets/hoc/auth-guard';
import OverviewNav from '@/components/patient-profile/overview/OverviewNav';
import { Container, Grid } from '@mui/material';
import AddLabReq from '@/components/patient-profile/lab/AddLabReq';
import PatientsLabRequestsGrid from '@/components/patient-profile/lab/LabRequestsGrid';

const CreateLabRequestByPatientPage = () => {
  return (
    <AuthGuard>
        <Container className="">
            <OverviewNav/>
            <Grid container spacing={4}>
                <Grid item md={12} xs={12}>
                    <section className="my-8 space-y-8 bg-white p-2 sm:p-4 rounded-lg">
                        <h1 className="text-xl text-primary">Lab Request</h1>
                        <PatientsLabRequestsGrid/>
                    </section>
                </Grid>
            </Grid>
        </Container>
    </AuthGuard>
  );
}

CreateLabRequestByPatientPage.getLayout = (page) => (
    <PatientConfirmedProtect>
      <ProfileLayout>{page}</ProfileLayout>
    </PatientConfirmedProtect>
);

export default CreateLabRequestByPatientPage