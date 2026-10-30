import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router';

const PhamarcyNav = () => {
    const router = useRouter();
    const pathName = router.pathname
    return (
        <div className="flex items-center gap-4 my-8">
            <Link href='/dashboard/phamarcy' className={`${pathName === '/dashboard/phamarcy' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Prescriptions
            </Link>
            <Link href='/dashboard/phamarcy/public-prescriptions' className={`${pathName === '/dashboard/phamarcy/public-prescriptions' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Public Prescriptions
            </Link>
            <Link href='/dashboard/phamarcy/create-invoice' className={`${pathName === '/dashboard/phamarcy/create-invoice' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                New Invoice
            </Link>
            {/* <RequisitionModal /> */}
            <Link href='/dashboard/phamarcy/create-requisition' className={`${pathName === '/dashboard/phamarcy/create-requisition' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Create Requisition
            </Link>
            <Link href='/dashboard/phamarcy/pharmacy-inventory' className={`${pathName === '/dashboard/phamarcy/pharmacy-inventory' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Pharmacy Inventory
            </Link>
            <Link href='/dashboard/phamarcy/settings' className={`${pathName === '/dashboard/phamarcy/settings' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Settings
            </Link>
        </div>
    )
}

export default PhamarcyNav;