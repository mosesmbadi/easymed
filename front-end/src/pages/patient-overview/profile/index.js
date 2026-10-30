import AuthGuard from '@/assets/hoc/auth-guard';
import ProfileLayout from '@/components/layout/profile-layout';
import OverviewNav from '@/components/patient-profile/overview/OverviewNav';
import PersonalDetails from '@/components/patient-profile/personal-details';
import { Container, Grid } from '@mui/material';
import React from 'react'

const PatientProfile = () => {
  return (
    <AuthGuard>
      <Container className="">
        <OverviewNav/>
        <Grid container spacing={4}>
          <Grid item md={12} xs={12}>
            <section className="my-8 space-y-8 bg-white p-2 sm:p-4 rounded-lg">
              <section className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl text-primary">Personal Information</h1>
                </div>
              </section>
              <PersonalDetails />
            </section>
          </Grid>
        </Grid>
      </Container>
    </AuthGuard>

  )
}

PatientProfile.getLayout = (page) => <ProfileLayout>{page}</ProfileLayout>;

export default PatientProfile