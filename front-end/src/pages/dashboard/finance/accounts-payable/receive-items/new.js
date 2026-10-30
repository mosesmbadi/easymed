import React from 'react';
import { Container, Tooltip, IconButton, Box, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AuthGuard from '@/assets/hoc/auth-guard';
import ProtectedRoute from '@/assets/hoc/protected-route';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AccountsPayableNav from '@/components/dashboard/finance/AccountsPayableNav';
import NewItems from '@/components/dashboard/inventory/incomingItems/NewItems';

// Create (Receive) Items page under Finance > Accounts Payable
const APReceiveNewItemPage = () => {
  return (
    <Container maxWidth="xl" className='my-8'>
      <AccountsPayableNav />
      <Box display='flex' alignItems='center' mb={2} mt={-2}>
        <Typography variant='h6' component='h2' className='flex items-center'>
          Receive Items
          <Tooltip
            title={
              <span>
                Record items being received into inventory.<br/>Populate from a purchase order generated from a requisition.
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
      <NewItems heading='Receive Items' redirectToList='/dashboard/finance/accounts-payable/receive-items' />
    </Container>
  );
};

APReceiveNewItemPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_BILLING_DASHBOARD'}>
    <AuthGuard>
      <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
  </ProtectedRoute>
);

export default APReceiveNewItemPage;
