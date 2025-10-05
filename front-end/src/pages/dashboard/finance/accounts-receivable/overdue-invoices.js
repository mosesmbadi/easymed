import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

const RedirectOverdueInvoices = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/finance/accounts-receivable/invoices');
  }, [router]);
  return null;
};

RedirectOverdueInvoices.getLayout = (page) => page;

export default RedirectOverdueInvoices;
