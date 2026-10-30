import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector,  } from 'react-redux';
import { toast } from "react-toastify";
import { MdLocalPrintshop } from 'react-icons/md'
import { updateInvoices } from '@/redux/service/billing'
import { useAuth } from '@/assets/hooks/use-auth'
import { ErrorMessage, Field, Form, Formik, } from 'formik';
import * as Yup from "yup";
import FormButton from '@/components/common/button/FormButton';
import PayAmountsDisplay from '@/components/dashboard/billing/payOverview/PayAmountsDisplay';
import InvoiceItems from './InvoiceItems';

const ReviewInvoice = ({ 
    selectedOption,
    selectedInvoice,
    selectedPatient,
    setSelectedPrescribedDrugs,
    setSelectedLabRequests,
    setSelectedAppointments
    }) => 
    
    {
    const [loading, setLoading] = useState(false)
    const { invoiceItems } = useSelector((store)=> store.billing)

    const [appointmentSum, setAppointmentSum] = useState(0);
    const [appointmentInsuranceSum, setAppointmentInsuranceSum] = useState(0);
    const [appointmentCashSum, setAppointmentCashSum] = useState(0);

    const [prescribedDrugsSum, setPrescribedDrugsSum] = useState(0);
    const [prescribedDrugsInsuranceSum, setPrescribedDrugsInsuranceSum] = useState(0);
    const [prescribedDrugsCashSum, setPrescribedDrugsCashSum] = useState(0);


    const [labReqSum, setLabReqSum] = useState(0);
    const [labReqInsuranceSum, setLabReqInsuranceSum] = useState(0);
    const [labReqCashSum, setLabReqCashSum] = useState(0);


    const auth = useAuth()
    const invoiceRef = useRef();
    const router = useRouter();

    const validationSchema = Yup.object().shape({
        // invoice_description: Yup.string().required("This field is required!"),
        // cash_paid: Yup.number().required("This field is required!"),
      });

    function sumArray(array) {
        return array.reduce(function (accumulator, currentValue) {
          return accumulator + currentValue;
        }, 0);
      }

    const totalAppointmentSum = (selectedAppointments) => {
        let totalFees = []
        let cashFees = []
        let insuranceFees = []
        selectedAppointments.forEach((item)=>{
            if(item.payment_mode){
                totalFees.push(parseInt(item.item_amount))
                if(item.payment_mode_name.toLowerCase() === "cash"){
                    cashFees.push(parseInt(item.item_amount))
                }else {
                    const co_pay = parseInt(item.item_amount) - parseInt(item.actual_total)
                    cashFees.push(parseInt(co_pay))
                    insuranceFees.push(parseInt(item.item_amount) - parseInt(co_pay))
                }

            }
        })

        setAppointmentSum(sumArray(totalFees));
        setAppointmentInsuranceSum(sumArray(insuranceFees));
        setAppointmentCashSum(sumArray(cashFees));

    }

    const totalPrescribedDrugsSum = (selectedPrescribedDrugs) => {
        let totalFees = []
        let cashFees = []
        let insuranceFees = []

        selectedPrescribedDrugs.forEach((item)=>{
            if(item.payment_mode){
                totalFees.push(parseInt(item.item_amount))
                if(item.payment_mode_name.toLowerCase() === "cash"){
                    cashFees.push(parseInt(item.item_amount))
                }else {
                    const co_pay = parseInt(item.item_amount) - parseInt(item.actual_total)
                    cashFees.push(parseInt(co_pay))
                    insuranceFees.push(parseInt(item.item_amount) - (parseInt(co_pay)))

                }

            }
        })

        setPrescribedDrugsSum(sumArray(totalFees));
        setPrescribedDrugsInsuranceSum(sumArray(insuranceFees));
        setPrescribedDrugsCashSum(sumArray(cashFees));

    }

    const totalLabReqSum = (selectedLabRequests) => {
        let totalFees = []
        let cashFees = []
        let insuranceFees = []
        selectedLabRequests.forEach((item)=>{
            if(item.payment_mode){
                totalFees.push(parseInt(item.item_amount))
                if(item.payment_mode_name.toLowerCase() === "cash"){
                    cashFees.push(parseInt(item.item_amount))
                }else {
                    const co_pay = parseInt(item.item_amount) - parseInt(item.actual_total)
                    cashFees.push(parseInt(co_pay))
                    insuranceFees.push(parseInt(item.item_amount) - (parseInt(co_pay)))
                }

            }
        })

        setLabReqSum(sumArray(totalFees));
        setLabReqInsuranceSum(sumArray(insuranceFees));
        setLabReqCashSum(sumArray(cashFees));

    }

    const updateInvoice = async (formValue) => {
        
        const payloadData = {
            ...formValue,
            status: "paid",
          }

          console.log("SAVE INVOICE PAYLOAD",payloadData)

        try {
            setLoading(true)

            const response = await updateInvoices(auth,selectedInvoice.id, payloadData)
            console.log(response)
            toast.success("invoice saved successfully");
            setLoading(false);
            router.push('/dashboard/billing');

        }catch(e){
            toast.error(e);
            setLoading(false);
            console.log("ERROR SAVING INVOICE", e)
        }
    }



  return (
    <Formik
        initialValues={{ invoice_description: '', status:"paid", cash_paid: "" }}
        validationSchema={validationSchema}
        onSubmit={()=> console.log("submit")}
    >
        <Form ref={invoiceRef} className="py-4 bg-white_light rounded-lg space-y-4 px-2 min-h-full flex flex-col justify-between">
            {selectedOption && 
            <>
            <div ref={invoiceRef} className='space-y-8'>
            {/* <div className='flex justify-between items-center'>
                <div>
                    <p className='text-2xl'> {selectedOption?.label} </p>
                    {selectedInvoice && (<p className='text-lg text-center'>{`Invoice Number: ${selectedInvoice.invoice_number}`}</p>)}
                </div>
                <div>
                <Field
                    as="textarea"
                    className="bg-white rounded-lg text-sm p-2 px-4 focus:outline-none w-full"
                    maxWidth="sm"
                    placeholder="Enter invoice description"
                    name="invoice_description"
                />
                <ErrorMessage
                    name="invoice_description"
                    component="div"
                    className="text-warning text-xs"
                />
                </div>
            </div> */}
            {InvoiceItems.length > 0 && selectedInvoice && (
                <InvoiceItems 
                    selectedPatient={selectedPatient} 
                    selectedInvoice={selectedInvoice}
                    items={invoiceItems}    
                    setSelectedPrescribedDrugs={setSelectedPrescribedDrugs}
                    setSelectedLabRequests={setSelectedLabRequests}
                    setSelectedAppointments={setSelectedAppointments}
                    totalLabReqSum={totalLabReqSum}
                    totalAppointmentSum={totalAppointmentSum}
                    totalPrescribedDrugsSum={totalPrescribedDrugsSum}
                    setLabReqSum={setLabReqSum}
                    setLabReqCashSum={setLabReqCashSum}
                    setLabReqInsuranceSum={setLabReqInsuranceSum}
                    setAppointmentSum={setAppointmentSum}
                    setAppointmentCashSum={setAppointmentCashSum}
                    setAppointmentInsuranceSum={setAppointmentInsuranceSum}
                    setPrescribedDrugsSum={setPrescribedDrugsSum}
                    setPrescribedDrugsCashSum={setPrescribedDrugsCashSum}
                    setPrescribedDrugsInsuranceSum={setPrescribedDrugsInsuranceSum}
                />
            )}
            </div>

            <section className='mt-auto mr-4 space-y-4 bottom-0'>
                <PayAmountsDisplay
                    appointmentCashSum={appointmentCashSum}
                    prescribedDrugsCashSum={prescribedDrugsCashSum}
                    labReqCashSum={labReqCashSum}
                    appointmentInsuranceSum={appointmentInsuranceSum}
                    prescribedDrugsInsuranceSum={prescribedDrugsInsuranceSum}
                    labReqInsuranceSum={labReqInsuranceSum}
                    appointmentSum={appointmentSum}
                    prescribedDrugsSum={prescribedDrugsSum}
                    labReqSum={labReqSum}
                />

                <section className="flex items-center justify-end gap-2">
                {/* <FormButton loading={loading} label={"Save Invoice"}/> */}
                {/* <button onClick={()=>console.log("printed")} className="border border-primary flex items-center gap-2 px-3 py-2 text-xs rounded-xl">
                    <MdLocalPrintshop />
                    Print Invoice
                </button> */}
                </section>
            </section>
            </>}
        </Form>
    </Formik>
  )
}

export default ReviewInvoice