import React from 'react'
import { Container, Grid } from '@mui/material'

import AccountNav from '@/components/account/AccountNav'
import AuthGuard from '@/assets/hoc/auth-guard'
import CustomizedLayout from '@/components/layout/customized-layout'
import NewPostModal from '@/components/announcement/NewPost'
import AnnouncementPosts from '@/components/announcement/AnnouncementPosts'

const Announcements = () => {
  return (
    <Container className='py-8' maxWidth="xl">
        <Grid container className='bg-white h-[80vh] overflow-auto rounded-lg py-8 px-4'>
            <Grid className='flex justify-center' item xs={3}>
                <AccountNav/>
            </Grid>
            <Grid className='items-center rounded-lg gap-4' item xs={9}>
                <NewPostModal/>
                <AnnouncementPosts paginate={5}/>
            </Grid>
        </Grid>
    </Container>
  )
}

Announcements.getLayout = (page) => (
  <AuthGuard>
    <CustomizedLayout>{page}</CustomizedLayout>;
  </AuthGuard>
);

export default Announcements