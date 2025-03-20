import React, { useEffect, useState } from 'react'
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Grid } from "@mui/material";
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { useRouter } from 'next/router';
import { toast } from "react-toastify";

import ViewPOItemsModal from './ViewPOItemsModal'
import GRNote from './GRNote'
import SupplierInvoice from './SupplierInvoice'
import { addIncomingItem, createGRNote, createSupplierInvoice, fetchIncomingItems, updateIncomingItem } from '@/redux/service/inventory';
import { useAuth } from '@/assets/hooks/use-auth';
import { getAllIncomingItems } from '@/redux/features/inventory';


const ReceiveIncomingItems = ({ open, setOpen, selectedRowData, setSelectedRowData }) => {
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState(null);
    const [poIncomingItems, setPoIncomingItems] = useState([]);
    const auth = useAuth()
    const router = useRouter()

    const handleClose = () => {
        setOpen(false);
    };

    const initialValues = {

        invoice_no : "",
        amount : 0,
        note: "",
        status : "pending",
        supplier : selectedRowData ? selectedRowData?.items[0].preferred_supplier : "",
        purchase_order : selectedRowData?.id || ""
    
    }
    
    const validationSchema = Yup.object().shape({
        invoice_no: Yup.string().required("This field is required!"),
        amount: Yup.string().required("This field is required!"),
    });

    const postIncomings =  async (item, supplierInvoice, gRNote) => {
        const payload = {
            "item_code": item.item_code,
            "purchase_price": item.buying_price,
            "sale_price": item.selling_price,
            "quantity": item.quantity_received ? item.quantity_received : item.quantity_approved,
            "category_one": item.category_one ? item.category_one : "",
            "item": item.item,
            "purchase_order": supplierInvoice.purchase_order,
            "supplier_invoice": supplierInvoice.id,
            "supplier": supplierInvoice.supplier,
            "goods_receipt_note": gRNote.id,
            "lot_no": item.lot_no ? item.lot_no : "",
            "expiry_date": item.expiry_date ? new Date(item.expiry_date).toISOString().split('T')[0] : ""
        }
        try {
            const response = await addIncomingItem(payload, auth)
            console.log("SAVED INCOMING ITEM", response)
        }catch(error){

        }
    }

    const saveIncomingItems = (incomingItems, supplierInvoice, gRNote) => {
        incomingItems.forEach((item)=> postIncomings(item, supplierInvoice, gRNote))        
    }

    const handleAddIncomingItem = async ( formvalues ) => {
        if(!selectedItems || selectedItems.selectedRowsData.length < 1){
            toast.error("No Item is selected")
            return
        }

        const payload = {
            ...formvalues,
        }

        try{

            // if its a partial purchase order? update records of incoming items
            // else create new records

            if(selectedRowData?.status === 'PARTIAL'){
                selectedItems.selectedRowsData.forEach((selected) => {
                    const relatedIncomingItem = poIncomingItems.find((incoming) => selected.item === incoming.item);
                    if(relatedIncomingItem){
                        updateIncomingItem(relatedIncomingItem.id, {quantity: selected.quantity_received}, auth)
                    }
                })

                toast.success("Purchase order Updated Successfully");

            }else{

                const supplierInvoiceResponse = await createSupplierInvoice(payload, auth)
            
                const gRNoteResponse = await createGRNote(payload, auth)
                
                saveIncomingItems(selectedItems.selectedRowsData, supplierInvoiceResponse, gRNoteResponse)
    
                toast.success("Purchase order Created Successfully");

            }

            router.push("/dashboard/inventory/incoming-items");

        }catch(error){
            console.log("ERROE", error)
        }

    }

    /**\
     * IF IS A PARTIAL PURCHASE ORDER?
     * GET RECORD IN DB FOR THE INCOMINGS CREATED THAT ARE RELATED TO THIS PURCHASE ORDER
     * 
     */

    const getCreatedIncomingItemsForPartialPO = async() => {
        const filter = {
            purchase_order: selectedRowData?.id
        }
        try{
            const response = await fetchIncomingItems(auth, filter);
            setPoIncomingItems(response)
        }catch(error){
            console.log("ERROR GETTING INCOMINGS", error)

        }
    }

    useEffect( () => {
        if(auth.token){
            if(selectedRowData?.status === 'PARTIAL'){
                getCreatedIncomingItemsForPartialPO()
            }
        }
    }, [auth])
    

  return (
    <Dialog
        fullWidth
        maxWidth="lg"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
    >
        <DialogContent>
            <DialogTitle>
                <div className='flex justify-between'>
                    <h2 className='text-lg font-bold'>{selectedRowData?.PO_number}</h2>
                    <div className='flex gap-5'>
                        <h2 className='font-bold'> {`ordered by: ${selectedRowData?.ordered_by}`} </h2>
                    </div>
                </div>
            </DialogTitle>
            {selectedRowData?.status !== 'PARTIAL' && (
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleAddIncomingItem}
            >
            {({ values, handleChange }) => (
              <Form className="">
                <div>
                    <h2 className='text-lg font-bold'>Supplier Invoice Details</h2>
                    <SupplierInvoice />
                </div>
                <div>
                    <h2 className='text-lg font-bold'>Goods Received Note Details</h2>
                    <GRNote/>
                </div>
                <ViewPOItemsModal 
                    selectedRowData={selectedRowData} setSelectedRowData={setSelectedRowData}
                    setSelectedItems={setSelectedItems}
                    createdIncomings={poIncomingItems}
                    values={values}
                />
                <Grid className='my-2' item md={12} xs={12}>
                    <div className="flex items-center justify-end">
                        <button
                        type="submit"
                        className="bg-primary rounded-xl text-sm px-8 py-2 text-white"
                        >
                        {loading && (
                            <svg
                            aria-hidden="true"
                            role="status"
                            className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
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
                        Receive Items
                        </button>
                    </div>
                </Grid>
              </Form>)}
            </Formik>
            )}

            {/* show when po is partial state */}
            {selectedRowData?.status === 'PARTIAL' && (
            <Formik
                initialValues={initialValues}
                // validationSchema={validationSchema}
                onSubmit={handleAddIncomingItem}
            >
                <Form className="">
                <ViewPOItemsModal 
                    selectedRowData={selectedRowData} setSelectedRowData={setSelectedRowData}
                    setSelectedItems={setSelectedItems}
                    createdIncomings={poIncomingItems}
                />
                <Grid className='my-2' item md={12} xs={12}>
                    <div className="flex items-center justify-end">
                        <button
                        type="submit"
                        className="bg-primary rounded-xl text-sm px-8 py-2 text-white"
                        >
                        {loading && (
                            <svg
                            aria-hidden="true"
                            role="status"
                            className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
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
                        Update Items
                        </button>
                    </div>
                </Grid>
                </Form>
            </Formik>
            )}
        </DialogContent>
    </Dialog>
  )
}

export default ReceiveIncomingItems