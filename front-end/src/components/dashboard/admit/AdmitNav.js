import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router';

const AdmitNav = () => {
    const router = useRouter();
    const pathName = router.pathname
  return (
    <div className="flex items-center gap-8 my-4">
        <Link href="/dashboard/admit/patients" className={`${ pathName.includes("/dashboard/admit/patients")  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
            Admit Patients
        </Link>
        <Link href='/dashboard/admit/wards' className={`${ pathName.includes("/dashboard/admit/wards")  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
            wards
        </Link>
        {/* <Link href="/dashboard/laboratory/lab-inventory" className={`${ pathName === "/dashboard/laboratory/lab-inventory"  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
            Lab Inventory
        </Link>  */}
         <Link href="/dashboard/admit/settings" className={`${ pathName.includes("/dashboard/admit/settings")  ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
            Inpatient Settings
        </Link>
    </div>
  )
}

export default AdmitNav;