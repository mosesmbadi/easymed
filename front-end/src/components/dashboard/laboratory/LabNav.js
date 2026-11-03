import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router';
import { useAuth } from '@/assets/hooks/use-auth';
import { fetchAnalyzerInboxSummary } from '@/redux/service/laboratory/analyzers';

const LabNav = () => {
    const router = useRouter();
    const pathName = router.pathname
    const auth = useAuth();
    // Analyzer results waiting on someone; refreshed on every lab page change.
    const [waiting, setWaiting] = useState(0);

    useEffect(() => {
        if (!auth) return;
        fetchAnalyzerInboxSummary(auth)
            .then((summary) => setWaiting(summary.open || 0))
            .catch(() => setWaiting(0));
    }, [auth, pathName]);
    return (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 my-4">
            <Link href="/dashboard/laboratory/walk-in" className={`${pathName === "/dashboard/laboratory/walk-in" ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                New Walk-in
            </Link>
            <Link href="/dashboard/laboratory/receive-samples" className={`${pathName === "/dashboard/laboratory/receive-samples" ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Receive Samples
            </Link>
            <Link href="/dashboard/laboratory"className={`${pathName === "/dashboard/laboratory" ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Phlebotomy
            </Link>
            <Link href='/dashboard/laboratory/lab-results' className={`${pathName === '/dashboard/laboratory/lab-results' || pathName === '/dashboard/laboratory/add-results' ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1`}>
                Lab Results
            </Link>

            <Link href="/dashboard/laboratory/analyzer-inbox" className={`${pathName === "/dashboard/laboratory/analyzer-inbox" ? 'bg-primary text-white' : 'bg-white shadow'}  text-sm rounded px-3 py-2 mb-1 flex items-center gap-2`}>
                Analyzer Inbox
                {waiting > 0 && (
                    <span className="bg-warning text-white rounded-full text-xs px-2 py-0.5">{waiting}</span>
                )}
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