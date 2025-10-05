import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Legacy route redirecting to new Finance > Accounts Payable create purchase order page
const LegacyAddPurchaseRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-payable/purchase-orders/new');
  }, [router]);
  return null;
};

export default LegacyAddPurchaseRedirect;