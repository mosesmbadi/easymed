import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Legacy billing reports page now redirects to Accounts Receivable reports
const LegacyBillingReportsRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-receivable/report');
  }, []);
  return null;
};

export default LegacyBillingReportsRedirect;