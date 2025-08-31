import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const BillingNav = () => {
  const router = useRouter();
  const pathName = router.pathname
  return (
    <div className="flex items-center gap-8 my-8">
    <Link href='/dashboard/billing' className={`${ pathName === '/dashboard/billing'  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
      Invoice
    </Link>
    <Link href='/dashboard/billing/create-invoice' className={`${pathName === '/dashboard/billing/create-invoice' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
      Bill Invoice
    </Link>
    <Link href='/dashboard/billing/payments' className={`${ pathName === '/dashboard/billing/payments'  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
      Receive Payments
    </Link>
    <Link href='/dashboard/billing/overdue-invoices' className={`${pathName === '/dashboard/billing/overdue-invoices' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
      Overdue Invoices
    </Link>
    {/* <RequisitionModal /> */}
    <Link href='/dashboard/inventory/incoming-items' className={`${pathName === '/dashboard/inventory/incoming-items' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
      View Items
    </Link>
    <Link href='/dashboard/billing/report' className={`${pathName === '/dashboard/billing/report' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
      Reports
    </Link>
    <Link href='/dashboard/billing/settings' className={`${pathName === '/dashboard/billing/settings' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
      Settings
    </Link>
  </div>
  )
}

export default BillingNav