import { useEffect } from 'react';
import { useRouter } from 'next/router';

const LegacyRequisitionsRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-payable/requisitions');
  }, [router]);
  return null;
};

export default LegacyRequisitionsRedirect;