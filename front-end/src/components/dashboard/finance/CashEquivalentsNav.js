import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

// Navigation specific to Cash and Cash Equivalents module
const CashEquivalentsNav = () => {
    const { pathname } = useRouter();
    const base = '/dashboard/finance/cash-equivalents';
    const links = [
        { href: `${base}`, label: 'Cash and Cash equivalents', exact: true },
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

export default CashEquivalentsNav;
