import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

// Legacy Billing payments page now redirects to Finance > Accounts Receivable > Payments
const LegacyBillingPaymentsRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-receivable/payments');
  }, [router]);
  return null; // Optionally could return a spinner
};

LegacyBillingPaymentsRedirect.getLayout = (page) => page; // Bare layout since we instantly redirect

export default LegacyBillingPaymentsRedirect;