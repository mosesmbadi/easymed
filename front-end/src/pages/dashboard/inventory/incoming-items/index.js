import { useEffect } from 'react';
import { useRouter } from 'next/router';

const LegacyIncomingItemsRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-payable/incoming-items');
  }, [router]);
  return null;
};

export default LegacyIncomingItemsRedirect;