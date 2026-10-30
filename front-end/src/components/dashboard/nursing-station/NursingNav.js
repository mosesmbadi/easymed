import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const NursingNav = () => {
    const router = useRouter();
    const pathName = router.pathname;
    return (
        <div className="flex items-center gap-8 my-4">
            <Link
                href="/dashboard/nursing-station"
                className={`${pathName === "/dashboard/nursing-station" ? 'bg-primary text-white' : 'bg-white shadow'} text-sm rounded px-3 py-2 mb-1`}
            >
                Nursing Station
            </Link>
            <Link
                href="/dashboard/nursing-station/settings"
                className={`${pathName === "/dashboard/nursing-station/settings" ? 'bg-primary text-white' : 'bg-white shadow'} text-sm rounded px-3 py-2 mb-1`}
            >
                Settings
            </Link>
        </div>
    );
};

export default NursingNav;
