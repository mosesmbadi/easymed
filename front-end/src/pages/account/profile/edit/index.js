import React from 'react'

import AuthGuard from '@/assets/hoc/auth-guard';
import CustomizedLayout from '@/components/layout/customized-layout';
import { Container, Grid } from '@mui/material';

import AccountNav from '@/components/account/AccountNav';
import ProfileEdit from '@/components/account/ProfileEdit';

const EditProfile = () => {
  return (
    <Container className='py-8' maxWidth="xl">
      <Grid container className='bg-white h-[80vh] rounded-lg py-8 px-4'>
          <Grid className='flex justify-center' item xs={2}>
              <AccountNav/>
          </Grid>
          <Grid className='flex rounded-lg' item xs={10}>
              <ProfileEdit/>
          </Grid>
      </Grid>
    </Container>
  )
}

EditProfile.getLayout = (page) => (
    <AuthGuard>
      <CustomizedLayout>{page}</CustomizedLayout>;
    </AuthGuard>
);

export default EditProfile;