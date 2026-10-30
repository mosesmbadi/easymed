import React from 'react'
import { Container, Grid } from '@mui/material';
import AuthGuard from '@/assets/hoc/auth-guard';
import CustomizedLayout from '@/components/layout/customized-layout';
import AccountNav from '@/components/account/AccountNav';
import AccountProfile from '@/components/account/AccountProfile';

const MyProfile = () => {
  return (
    <Container className='py-8' maxWidth="xl">
      <Grid container className='bg-white h-[80vh] rounded-lg py-8 px-4'>
          <Grid className='flex justify-center' item xs={3}>
              <AccountNav/>
          </Grid>
          <Grid className='flex justify-center rounded-lg' item xs={9}>
              <AccountProfile/>
          </Grid>
      </Grid>
    </Container>
  )
}

MyProfile.getLayout = (page) => (
    <AuthGuard>
      <CustomizedLayout>{page}</CustomizedLayout>;
    </AuthGuard>
);

export default MyProfile;