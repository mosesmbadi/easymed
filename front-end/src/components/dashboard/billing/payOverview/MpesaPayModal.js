import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import * as Yup from "yup"
import { Dialog, DialogContent, DialogTitle } from '@mui/material'
import { ErrorMessage, Field, Form, Formik } from 'formik'
import { CiMoneyCheck1 } from 'react-icons/ci'
import FormButton from '@/components/common/button/FormButton'
import { formatMoney } from '@/functions/money'

const MpesaPayModal = ({patient_id, amount}) => {
    const [open, setOpen]=useState(false)
    const [loading, setLoading]=useState(false)
    const { patients } = useSelector((store) => store.patient);

    const selectedPatient = patients.find((patient)=> patient.id === patient_id)

    const handleClose = () => {
        setOpen(false)
    }

    const initialValues = {
        phone_number: selectedPatient?.phone
    }

    const validationSchema = Yup.object().shape({
        phone_number: Yup.number().required("phone number is required !")
    });

    const handlePay = () => {

        //handle stk push for lipa na mpesa

        try{

            setLoading(true)
            toast.success("HEY, IM PAYING VIA MPESA")
            setLoading(false)
            handleClose();

        }catch(error){
            setLoading(false)
            toast.error("error mpesa paying", error)
        }

    }


  return (
    <section>
        <CiMoneyCheck1 onClick={()=>setOpen(true)} className='w-8 h-8 cursor-pointer'/>
        <Dialog
            fullWidth
            maxWidth="sm"
            open={open}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
        <DialogTitle id="alert-dialog-slide-title">{`Pay ${formatMoney(amount)} with mpesa ?`}</DialogTitle>
        <DialogContent>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handlePay}
            >
                <Form className="py-4">
                    <label className="py-2 text-lg">{`Confirm Phone Number`}</label>
                    <Field
                        className="border border-gray w-full p-4 focus:outline-none rounded-lg my-2"
                        name="phone_number"
                        placeholder="enter phone number"
                        type="number"
                    />
                    <ErrorMessage
                        name="phone_number"
                        component="div"
                        className="text-warning text-xs"
                    />

                    <div>
                        <div className="flex justify-end gap-4 mt-8">
                        <button
                            onClick={handleClose}
                            className="border border-warning rounded-xl text-sm px-4 py-2 text-[#02273D]"
                        >
                            Cancel
                        </button>
                        <FormButton
                        loading={loading}
                        label={`Pay with Mpesa`}
                        />
                        </div>
                    </div>
                </Form>
            </Formik>
        </DialogContent>
        </Dialog>
    </section>
  )
}

export default MpesaPayModal