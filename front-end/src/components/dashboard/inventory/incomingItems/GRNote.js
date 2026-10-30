import React from 'react'
import { Field, ErrorMessage } from "formik";
import { Grid } from "@mui/material";

const GRNote = () => {
  return (
    <Grid container spacing={2}>
        <Grid className='my-2' item md={12} xs={12}>
            <label htmlFor="invoice_no">Receiving Note</label>
            <Field
                as="textarea"
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="Note"
                name="note"
                rows={2}
            />
            <ErrorMessage
                name="note"
                component="div"
                className="text-warning text-xs"
            />
        </Grid>

    </Grid>
  )
}

export default GRNote