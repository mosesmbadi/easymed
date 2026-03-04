import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router';

const LabNav = () => {
    const router = useRouter();
    const pathName = router.pathname
    return (
        <div className="flex items-center gap-8 my-4">
            <Link href="/dashboard/laboratory" className={`${pathName === "/dashboard/laboratory" ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Phlebotomy
            </Link>
            <Link href='/dashboard/laboratory/lab-results' className={`${pathName === '/dashboard/laboratory/lab-results' || pathName === '/dashboard/laboratory/add-results' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Lab Results
            </Link>
            <Link href="/dashboard/laboratory/sample-archive" className={`${pathName === "/dashboard/laboratory/sample-archive" ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Sample Archive
            </Link>
            <Link href="/dashboard/laboratory/lab-inventory" className={`${pathName === "/dashboard/laboratory/lab-inventory" ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Lab Inventory
            </Link>
            <Link href="/dashboard/laboratory/lab-settings" className={`${pathName === "/dashboard/laboratory/lab-settings" ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Lab Settings
            </Link>
        </div>
    )
}

export default LabNav