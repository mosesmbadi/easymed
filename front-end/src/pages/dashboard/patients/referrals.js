import React, { useState } from 'react'
import ReferralLayout from '@/components/layout/customized-layout'
import { Container } from '@mui/material'
import AllReferralsDataGrid from '@/components/dashboard/patient/all-referrals-datagrid'
import ReferredReferralsDatagrid from '@/components/dashboard/patient/referred-referrals-datagrid'
import ViewedReferralsDatagrid from '@/components/dashboard/patient/viewed-referrals-datagrid'
import CompletedReferralsDatagrid from '@/components/dashboard/patient/completed-referrals-datagrid'
import ReferPatientModal from '@/components/dashboard/patient/refer-patient-modal'


const Referrals = () => {
  const [currentTab,setCurrentTab] = useState(0)

  return (
    <Container maxWidth="xl">
      <section className="flex items-center justify-center md:gap-4 gap-1 my-8">
        <div>
          <button className={`${currentTab === 0 ? 'bg-primary text-white' : 'bg-white'} rounded-3xl shadow-2xl py-2 sm:px-8 px-4`} onClick={() => setCurrentTab(0)}>All</button>
        </div>
        <div>
          <button className={`${currentTab === 1 ? 'bg-primary text-white' : 'bg-white'} rounded-3xl shadow-2xl py-2 sm:px-8 px-4`} onClick={() => setCurrentTab(1)}>Referred</button>
        </div>
        <div>
          <button className={`${currentTab === 2 ? 'bg-primary text-white' : 'bg-white'} rounded-3xl shadow-2xl py-2 sm:px-8 px-4`} onClick={() => setCurrentTab(2)}>Viewed</button>
        </div>
        <div>
          <button className={`${currentTab === 3 ? 'bg-primary text-white' : 'bg-white'} rounded-3xl shadow-2xl py-2 ms:px-8 px-4`} onClick={() => setCurrentTab(3)}>Completed</button>
        </div>
      </section>
      <div>
        <ReferPatientModal />
      </div>
      {currentTab === 0 && <AllReferralsDataGrid /> }
      {currentTab === 1 && <ReferredReferralsDatagrid /> }
      {currentTab === 2 && <ViewedReferralsDatagrid /> }
      {currentTab === 3 && <CompletedReferralsDatagrid /> }
    </Container>
  )
}


Referrals.getLayout = (page)=>(
    <ReferralLayout>{page}</ReferralLayout>
)

export default Referrals