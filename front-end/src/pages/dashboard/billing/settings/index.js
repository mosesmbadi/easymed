import React, { useEffect } from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';
import { useRouter } from 'next/router';

// Transitional redirect page: billing settings moved under Finance > Accounts Receivable
const LegacyBillingSettingsRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-receivable/settings');
  }, [router]);
  return (
    <Box className='w-full h-[60vh] flex flex-col items-center justify-center gap-4'>
      <CircularProgress />
      <Typography variant='body2'>Billing settings have moved. Redirecting to Finance &gt; Accounts Receivable &gt; Settings...</Typography>
    </Box>
  );
};

export default LegacyBillingSettingsRedirect;