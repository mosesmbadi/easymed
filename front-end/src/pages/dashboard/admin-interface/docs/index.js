import React, { useState } from 'react'
import Link from 'next/link'
import { Container } from '@mui/material'
import AuthGuard from '@/assets/hoc/auth-guard'
import ProtectedRoute from '@/assets/hoc/protected-route'
import CustomizedLayout from '@/components/layout/customized-layout'
import DocsNav from '@/components/dashboard/admin-interface/docs/DocsNav'
import InventoryDocs from '@/components/dashboard/admin-interface/docs/InventoryDocs'
import LabDocs from '@/components/dashboard/admin-interface/docs/LabDocs'
import BillingDocs from '@/components/dashboard/admin-interface/docs/BillingDocs'

const DocsPage = () => {
  const [selectedSection, setSelectedSection] = useState('inventory')

  return (
    <Container maxWidth='xl' className='py-4'>
      <div className='flex items-center justify-between mb-4'>
        <h1 className='text-2xl font-bold'>System Documentation</h1>
        <Link
          href='/dashboard/admin-interface'
          className='text-sm text-primary hover:underline'
        >
          Back to Settings
        </Link>
      </div>
      <DocsNav
        selectedSection={selectedSection}
        setSelectedSection={setSelectedSection}
      />
      <div className='mt-4'>
        {selectedSection === 'inventory' && <InventoryDocs />}
        {selectedSection === 'lab' && <LabDocs />}
        {selectedSection === 'billing' && <BillingDocs />}
      </div>
    </Container>
  )
}

DocsPage.getLayout = (page) => (
  <ProtectedRoute permission={'CAN_ACCESS_ADMIN_DASHBOARD'}>
    <AuthGuard>
      <CustomizedLayout>{page}</CustomizedLayout>
    </AuthGuard>
  </ProtectedRoute>
)

export default DocsPage
