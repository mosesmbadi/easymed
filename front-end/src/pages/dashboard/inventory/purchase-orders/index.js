import { useEffect } from 'react';
import { useRouter } from 'next/router';

const LegacyPurchaseOrdersRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-payable/purchase-orders');
  }, [router]);
  return null;
};

export default LegacyPurchaseOrdersRedirect;