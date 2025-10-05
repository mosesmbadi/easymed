import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Legacy billing landing now redirects to Accounts Receivable invoices
const LegacyBillingRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-receivable/invoices');
  }, []);
  return null;
};

export default LegacyBillingRedirect;