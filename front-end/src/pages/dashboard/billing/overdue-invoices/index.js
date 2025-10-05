import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Legacy overdue invoices route now redirects to unified AR invoices listing
const LegacyOverdueInvoicesRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-receivable/invoices');
  }, []);
  return null;
};

export default LegacyOverdueInvoicesRedirect;