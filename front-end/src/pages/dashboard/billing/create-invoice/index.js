import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

// Legacy route: redirect users to new Finance Accounts Receivable Bill Invoice
const LegacyCreateInvoiceRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-receivable');
  }, [router]);
  return null;
};

export default LegacyCreateInvoiceRedirect;