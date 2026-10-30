import React, { useState } from 'react'
import { Container } from '@mui/material';
import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AdmitPatientDataGrid from '@/components/dashboard/admit/admit-patient-datagrid';
import WardBeds from '@/components/dashboard/admit/Beds';
import NursesDuties from '@/components/dashboard/admit/Duties';
import AdmitNav from '@/components/dashboard/admit/AdmitNav';
import { useParams } from 'next/navigation';

const WardDetails = () => {
const [currentTab, setCurrentTab] = useState(0)
const params = useParams()
  return (    
    <Container maxWidth="xl" className="mt-8">
        <AdmitNav />
        <section className="mb-2">
        <div className="w-full py-1 px-2 flex items-center gap-4 text-center">
            <div>
            <p
                className={`${
                currentTab === 0
                    ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                    : "cursor-pointer text-center p-4"
                }`}
                onClick={() => setCurrentTab(0)}
            >
                Admitted Patients
            </p>
            </div>
            <div>
            <p
                className={`${
                currentTab === 1
                    ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                    : "cursor-pointer text-center p-4"
                } `}
                onClick={() => setCurrentTab(1)}
            >
                Beds
            </p>
            </div>
            <div>
            <p
                className={`${
                currentTab === 2
                    ? "cursor-pointer text-primary p-4 border-b-2 border-primary text-center"
                    : "cursor-pointer text-center p-4"
                } `}
                onClick={() => setCurrentTab(2)}
            >
                Assigned Nurses
            </p>
            </div>
        </div>
        </section>
        <div className="mt-2">
        {currentTab === 0 && <AdmitPatientDataGrid ward_id={params?.ward_id}/>}
        {currentTab === 1 && <WardBeds />}
        {currentTab === 2 && <NursesDuties ward_id={params?.ward_id}/>}
        </div>
    </Container>
  )
}

WardDetails.getLayout = (page) => (
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
);

export default WardDetails