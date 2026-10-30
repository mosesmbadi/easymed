import React, {useEffect} from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Container, Grid } from "@mui/material";
import AuthGuard from "@/assets/hoc/auth-guard";
import { useSelector, useDispatch } from "react-redux";

import { useAuth } from "@/assets/hooks/use-auth";
import ChannelCards from "@/components/announcement/ChannelCards";
import { getAllAnnouncementsChannels } from "@/redux/features/announcements";
import ProtectedRoute from "@/assets/hoc/protected-route";

const Schedule = () => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const channels = useSelector((store)=> store.announcement.channels);

  useEffect(() => {
      if(auth){
          dispatch(getAllAnnouncementsChannels(auth));
      }        
  }, [auth]);

  const channel = channels.map((channel) => <ChannelCards channel={channel} key={channel.id}/>);
  return (
    <Container className="flex flex-col h-full" maxWidth="xl">
      <h2 className="text-2xl py-4">Channels</h2>
      <Grid className="flex justify-center items-center" container spacing={2}>
        {channel}
      </Grid>
    </Container>
  );
};

Schedule.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_ANNOUNCEMENT_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);
export default Schedule;
