import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

// Legacy inventory path now redirects to finance/accounts-payable receive-items create page
const LegacyNewIncomingItemRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-payable/receive-items/new');
  }, [router]);
  return null;
};

export default LegacyNewIncomingItemRedirect;