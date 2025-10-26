import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

// Legacy path: redirect to the new receive-items route
const LegacyIncomingItemsRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-payable/receive-items');
  }, [router]);
  return null;
};

export default LegacyIncomingItemsRedirect;
