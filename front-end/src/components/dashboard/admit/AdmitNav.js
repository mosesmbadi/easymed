import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router';

const AdmitNav = () => {
    const router = useRouter();
    const pathName = router.pathname
  return (
    <div className="flex items-center gap-8 my-4">
        <Link href="/dashboard/admit" className={`${ pathName === "/dashboard/admit"  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
            Patients
        </Link>
        <Link href='/dashboard/admit/wards' className={`${ pathName === '/dashboard/admit/wards' || pathName === '/dashboard/admit/wards'  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
            ward
        </Link>
        {/* <Link href="/dashboard/laboratory/lab-inventory" className={`${ pathName === "/dashboard/laboratory/lab-inventory"  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
            Lab Inventory
        </Link> 
         <Link href="/dashboard/laboratory/lab-settings" className={`${ pathName === "/dashboard/laboratory/lab-settings"  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
            Lab Settings
        </Link>  */}
    </div>
  )
}

export default AdmitNav;