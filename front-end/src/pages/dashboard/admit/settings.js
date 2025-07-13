import React, { useState } from 'react'
import { Container } from '@mui/material';

import AuthGuard from '@/assets/hoc/auth-guard';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AdmitNav from '@/components/dashboard/admit/AdmitNav';
import NursesDuties from '@/components/dashboard/admit/Duties';

const InpatientSettings = () => {
  const [currentTab, setCurrentTab] = useState(0)
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
            } `}
            onClick={() => setCurrentTab(0)}
          >
            Assigned Nurses
          </p>
        </div>
      </div>
    </section>
    <div className="mt-2">
      {currentTab === 0 && <NursesDuties />}
    </div>
  </Container>
  )
}

InpatientSettings.getLayout = (page) => (
    <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
    </AuthGuard>
);

export default InpatientSettings