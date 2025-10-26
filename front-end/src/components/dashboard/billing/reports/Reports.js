import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import * as Yup from 'yup'
import { ErrorMessage, Field, Form, Formik } from 'formik'
import { Grid } from '@mui/material'


import SeachableSelect from '@/components/select/Searchable';
import { getAllItems } from "@/redux/features/inventory";
import { saleByDateRange, saleByDateRangeAndItem } from '@/redux/service/reports'
import { saleByDateRangePdf, saleByDateRangeAndItemPdf } from '@/redux/service/pdfs'
import { useAuth } from '@/assets/hooks/use-auth'
function Reports() {
    const dispatch =  useDispatch()
    const auth = useAuth()
    const [ loading, setLoading ] = useState();
    const [checked, setChecked] = useState("Sale by Date Range");
    const { items } = useSelector((store) => store.inventory);

    const initialValues =  {
        item_id: "",
        start_date: "", 
        end_date: ""
    }

    const validationSchema =  Yup.object().shape({
        item_id: checked === "Sale by Date Range and Item Id" ?  Yup.object().required("Item is required!") : Yup.object(),
        start_date: Yup.date().required("Start Date is required"),
        end_date: Yup.date().required("Start Date is required"),
    })

    const handlePrint = async () => {
        try{

            if(checked === "Sale by Date Range and Item Id"){
                
                const response = await saleByDateRangeAndItemPdf()
                toast.success("got pdf successfully")
                window.open(response.url, '_blank');

            }else if(checked === "Sale by Date Range"){

                const response = await saleByDateRangePdf()
                toast.success("got pdf successfully")
                window.open(response.url, '_blank');

            }

        }catch(error){
            console.log(error)
            toast.error(error)
        }
        
    };

    const getReport = async (formValue)=> {
        console.log("DATA TO THE API", formValue.start_date > formValue.end_date)

        if(formValue.start_date > formValue.end_date){
            toast.error("End date should be greater than start date")
            return
        }
        console.log("DATA TO THE API AFTER", formValue.start_date > formValue.end_date)
        try {
            setLoading(true)
            const payloadWithId = {
                item_id: formValue.item_id.value,
                start_date: formValue.start_date, 
                end_date: formValue.end_date
            };
            const payloadWithoutId = {
                start_date: formValue.start_date, 
                end_date: formValue.end_date
            }    
            const payload = checked === "Sale by Date Range and Item Id" ? payloadWithoutId : payloadWithId;

            if(checked === "Sale by Date Range and Item Id"){

                await saleByDateRangeAndItem(payloadWithId, auth).then((res)=> {
                    console.log("RESPONSE IS", res)
                    handlePrint()
                })

            }else if(checked === "Sale by Date Range"){
                await saleByDateRange(payload).then((res)=>{
                    console.log("RESPONSE IS", res)
                    handlePrint()
    
                });
            }
            setLoading(false)

        }catch(e){
            toast.error("Error", e)
            setLoading(false)
        }


    }

    useEffect(()=> {
        dispatch(getAllItems(auth));
    },[])

  return (
    <div className='w-full bg-white h-96 px-4 py-4'>
        <div className='flex gap-4 mb-8'>
            <div className='flex gap-4'>
                <input onClick={()=>setChecked("Sale by Date Range")} className='font-bold cursor-pointer' checked={checked==="Sale by Date Range"} type='checkbox'/>
                <p className='font-bold'>Sale by Date Range</p>
            </div>
            <div className='flex gap-4'>
                <input onClick={()=>setChecked("Sale by Date Range and Item Id")} className='font-bold cursor-pointer' checked={checked==="Sale by Date Range and Item Id"} type='checkbox'/>
                <p className='font-bold'>Sale by Date Range and Item Id</p>
            </div>
        </div>
        <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={getReport}
        >
            <Form>
            <Grid container spacing={2}>
                {checked === "Sale by Date Range and Item Id" && (

                    <Grid className='my-2' item md={12} xs={12}>
                    <SeachableSelect
                    label="Select Item"
                    name="item_id"
                    options={items.map((item) => ({ value: item.id, label: `${item?.name}` }))}
                    />
                    <ErrorMessage
                    name="item_id"
                    component="div"
                    className="text-warning text-xs"
                    />
                    </Grid>

                ) }
                <Grid item md={6} xs={12}>
                    <Field
                        className="block border border-gray py-3 px-4 focus:outline-none w-full"
                        type="date"
                        placeholder="Enter Company Name"
                        name="start_date"
                    />
                    <ErrorMessage
                        name="start_date"
                        component="div"
                        className="text-warning text-xs"
                    />
                </Grid>
                <Grid item md={6} xs={12}>
                    <Field
                        className="block border border-gray py-3 px-4 focus:outline-none w-full"
                        type="date"
                        placeholder="Enter Company Name"
                        name="end_date"
                    />
                    <ErrorMessage
                        name="end_date"
                        component="div"
                        className="text-warning text-xs"
                    />
                </Grid>
            </Grid>
            <div>
                <div className="flex justify-end gap-2 mt-4">
                <button
                    type="submit"
                    className="bg-primary px-4 py-2 text-white"
                >
                    {loading && (
                    <svg
                        aria-hidden="true"
                        role="status"
                        class="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                        ></path>
                        <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="#1C64F2"
                        ></path>
                    </svg>
                    )}
                    get report
                </button>
                </div>
            </div>
            </Form>
        </Formik>
    </div>
  )
}

export default Reports