import React from 'react';
import { Container, Tooltip, IconButton, Box, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import ProtectedRoute from '@/assets/hoc/protected-route';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import IncomingItemsGrid from '@/components/dashboard/inventory/incomingItems/IncomingItemsGrid';

// Receive Items page (renamed from Incoming Items)
const APReceiveItemsPage = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <Box display='flex' alignItems='center' mb={1} mt={-2}>
        <Typography variant='h6' component='h2' className='flex items-center'>
          Receive Items
          <Tooltip
            title={
              <span>
                This list shows items received into inventory.<br/>They originate from approved requisitions / linked purchase orders.
              </span>
            }
            arrow
            placement='right'
          >
            <IconButton size='small' sx={{ ml: 1 }} aria-label='Receive items info'>
              <InfoOutlinedIcon fontSize='inherit' />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>
      <IncomingItemsGrid />
    </Container>
  );
};

APReceiveItemsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APReceiveItemsPage;
