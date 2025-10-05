import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const InventoryNav = () => {
  const router = useRouter();
  const pathName = router.pathname;

  return (
    <div className="my-8">
      <div className="flex items-center gap-8 flex-wrap mb-4">
        <Link href='/dashboard/inventory' className={`${ pathName === '/dashboard/inventory' || pathName === '/dashboard/inventory/add-inventory'  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
          Inventory
        </Link>
        <Link href='/dashboard/inventory/items' className={`${pathName === '/dashboard/inventory/items' || pathName === '/dashboard/inventory/items/new' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
          Items
        </Link>
        <Link href='/dashboard/inventory/report' className={`${pathName === '/dashboard/inventory/report' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
          Reports
        </Link>
        <Link href='/dashboard/inventory/supplier-invoices' className={`${pathName === '/dashboard/inventory/supplier-invoices' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
          Supplier Invoices
        </Link>
      </div>
    </div>
  );
};

export default InventoryNav;