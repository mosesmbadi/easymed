import React, {useEffect} from 'react'
import { useParams } from 'next/navigation'
import { useSelector, useDispatch } from 'react-redux';

import AuthGuard from '@/assets/hoc/auth-guard';
import { useAuth } from '@/assets/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AnnouncementPosts from '@/components/announcement/AnnouncementPosts';
import { getAllAnnouncements } from '@/redux/features/announcements';
import ProtectedRoute from '@/assets/hoc/protected-route';

const ChannelsByName = () => {
    const params = useParams()
    const dispatch = useDispatch();
    const auth = useAuth();
    const channels = useSelector((store)=> store.announcement.channels);

    const channelId = channels.find((channel => channel.name === params.channel_name))    

    useEffect(()=>{
      if(auth){
        dispatch(getAllAnnouncements(auth))
      }
    }, [])
    console.log(params)
  return (
    <section className='py-8'>
     <AnnouncementPosts AnnouncementChannel={channelId}/>
    </section>
  )
}

ChannelsByName.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_ANNOUNCEMENT_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default ChannelsByName