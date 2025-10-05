import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Navigation specific to Accounts Payable module
const AccountsPayableNav = () => {
  const { pathname } = useRouter();
  const base = '/dashboard/finance/accounts-payable';
  const links = [
    { href: `${base}/requisitions`, label: 'Requisitions' },
    { href: `${base}/purchase-orders`, label: 'Purchase Orders' },
    { href: `${base}/incoming-items`, label: 'Incoming Items' },
  ];

  return (
    <div className="flex items-center gap-6 my-6 flex-wrap">
      {links.map(link => {
        const active = pathname === link.href || pathname.startsWith(link.href);
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

export default AccountsPayableNav;
