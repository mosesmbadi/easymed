import React from 'react'
import { Field, ErrorMessage } from "formik";
import { Grid } from "@mui/material";

const SupplierInvoice = ( ) => {

  return (
    <Grid container spacing={2}>
      <Grid className='my-2' item md={4} xs={12}>
        <label htmlFor="invoice_no">Invoice No</label>
        <Field
          className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
          maxWidth="sm"
          placeholder="Invoice Number"
          name="invoice_no"
          type="number"
        />
        <ErrorMessage
          name="invoice_no"
          component="div"
          className="text-warning text-xs"
        />
      </Grid>

      <Grid className='my-2' item md={4} xs={12}>
        <label htmlFor="quantity">Amount</label>
        <Field
          className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
          maxWidth="sm"
          placeholder="Amount"
          name="amount"
          type="number"
        />
        <ErrorMessage
          name="amount"
          component="div"
          className="text-warning text-xs"
        />
      </Grid>

      <Grid className='my-2' item md={4} xs={12}>
        <label htmlFor="quantity">Status</label>
        <Field
          as="select"
          className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
          maxWidth="sm"
          placeholder="Status"
          name="status"
        >
          <option value="" disabled>Select Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </Field>
        <ErrorMessage
          name="status"
          component="div"
          className="text-warning text-xs"
        />
      </Grid>

    </Grid>
  )
}

export default SupplierInvoice