import React from 'react';
import Link from 'next/link';
import CustomizedLayout from "../../../components/layout/customized-layout";
import { Container } from '@mui/material';



const InvoicesDataGrid = () => {
    return <Container maxWidth="xl">
        <div className="my-8">No invoices found <Link href="/dashboard/billing/new-invoice" className="text-link text-sm">Create an Invoice?</Link></div>
    </Container>
}

InvoicesDataGrid.getLayout = (page) => (
    <CustomizedLayout>{page}</CustomizedLayout>
)

export default InvoicesDataGrid;