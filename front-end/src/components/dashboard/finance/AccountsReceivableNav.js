import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Navigation specific to Accounts Receivable module
const AccountsReceivableNav = () => {
  const { pathname } = useRouter();
  const base = '/dashboard/finance/accounts-receivable';
  const links = [
    { href: `${base}`, label: 'Billing', exact: true },
    { href: `${base}/payments`, label: 'Receive Payments' },
    { href: `${base}/invoices`, label: 'Invoices' },
    { href: `${base}/debtors`, label: 'Debtors' },
    { href: `${base}/report`, label: 'Reports' },
    { href: `${base}/settings`, label: 'Settings' },
  ];

  return (
    <div className="flex items-center gap-6 my-6 flex-wrap">
      {links.map(link => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${active ? 'bg-primary text-white' : 'bg-white shadow'} text-sm rounded px-3 py-2`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
};

export default AccountsReceivableNav;
