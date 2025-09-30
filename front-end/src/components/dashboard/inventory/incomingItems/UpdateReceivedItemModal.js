import React, { useEffect, useState } from "react";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { DialogTitle, Grid } from "@mui/material";
import * as Yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { getAllItems, getItems, getAllSuppliers, updateRequisitionAfterPoGenerate } from "@/redux/features/inventory";
import { toast } from "react-toastify";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import SeachableSelect from "@/components/select/Searchable";
import { addRequisitionItem, updateRequisitionItem } from "@/redux/service/inventory";
import { useAuth } from "@/assets/hooks/use-auth";

const UpdateReceivedItemModal = ({ editOpen, setEditOpen, selectedEditRowData, setSelectedEditRowData, po, setSelectedRowData, createdIncomings }) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth()
  const { item, suppliers, inventoryItems } = useSelector(({ inventory }) => inventory);

  const handleClose = () => {
    setEditOpen(false);
  };

  const getItem = () => {
    const iteem = item.find((itm)=> parseInt(itm.id) === parseInt(selectedEditRowData.item))
    return iteem ? {value:iteem.id, label: iteem.name}: null
  }

  const getPreferredSupplier = () => {
    const supplier = suppliers.find((supplier)=> supplier.official_name === selectedEditRowData.preferred_supplier_name)
    return supplier ? {value:supplier.id, label: supplier.official_name}: null
  }

  const initialValues = {
    ...selectedEditRowData,
    // item: getItem() || null,
    // preferred_supplier: getPreferredSupplier() || null,
    // quantity_requested: selectedEditRowData?.quantity_requested || "",
    // quantity_approved: selectedEditRowData?.quantity_approved ?? "",
    // item_code: selectedEditRowData.item_code || "",
    // selling_price: selectedEditRowData.selling_price || "",
    // buying_price: selectedEditRowData.buying_price || "", 
    category_one: selectedEditRowData.lot_no || "", 
    lot_no: selectedEditRowData.lot_no || "",
    expiry_date: selectedEditRowData.expiry_date || "",
    quantity_received: selectedEditRowData.quantity_received || ""

  };

  const validationSchema = Yup.object().shape({
    // item: Yup.object().required("This field is required!"),
    // preferred_supplier: Yup.object().required("This field is required!"),
    // quantity_requested: Yup.number().required("This field is required!"),
    // quantity_approved: Yup.number().required("This field is required!"),
  });

  const handleUpdateRequisitionItem = async (formValue, helpers) => {
    console.log("ERROR", formValue)
    try {
    setLoading(true);
      const formData = {
        ...formValue,
        // preferred_supplier: formValue.preferred_supplier.value,
        // item: formValue.item.value,
      };

      // const response = await updateRequisitionItem(formData, selectedEditRowData.po, selectedEditRowData.id, auth)

        const gottenReqItemIndex = po.items.findIndex((item)=> item.id === formData.id)

        console.log("GOT AN ITEM AND IS", gottenReqItemIndex)

        if (gottenReqItemIndex !== -1) {
        
          // Create a copy of the items array and update the specific item
          const updatedItems = [...po.items];
          updatedItems[gottenReqItemIndex] = {
            ...formValue,
            category_one: formValue.category_one.value
          };
        
          // Create a new requisition object with the updated items array
          const updatedRequisition = {
            ...po,
            items: updatedItems,
          };
        
          // Update the selected row data with the updated requisition
          setSelectedRowData(updatedRequisition);
          console.log("AFTER AN UPDATE THE FOLLOWING IS ", updatedRequisition)

        }


      

      setLoading(false);
      handleClose()

    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(getAllItems(auth));
    dispatch(getItems(auth))
    dispatch(getAllSuppliers(auth));
    
  }, []);

  return (
    <section>
      <Dialog
        fullWidth
        maxWidth="md"
        open={editOpen}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle>
            <h3 className="text-xl font-bold my-4"> {`Edit ${selectedEditRowData.item_name}`} </h3>
        </DialogTitle>
        <DialogContent>
            <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleUpdateRequisitionItem}
            >
                <Form className="">
                <Grid container spacing={4}>
                  <Grid item md={4} xs={12}>
                      <label>Item Code</label>
                      <Field
                          className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                          maxWidth="sm"
                          placeholder="Item Code"
                          name="item_code"
                      />
                      <ErrorMessage
                          name="item_code"
                          component="div"
                          className="text-warning text-xs"
                      />
                  </Grid>
                  <Grid item md={4} xs={12}>
                    <label>Buying Price</label>
                    <Field
                        className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                        maxWidth="sm"
                        placeholder="Buying Price"
                        name="buying_price"
                    />
                    <ErrorMessage
                        name="buying_price"
                        component="div"
                        className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                    <label>Selling Price</label>
                    <Field
                        className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                        maxWidth="sm"
                        placeholder="Selling Price"
                        name="selling_price"
                    />
                    <ErrorMessage
                        name="selling_price"
                        component="div"
                        className="text-warning text-xs"
                    />
                  </Grid>
                  {createdIncomings.length <= 0 && (
                  <Grid className='my-2' item md={12} xs={12}>
                    <SeachableSelect
                      label="Select Category"
                      name="category_one"
                      options={[{value: "Resale", name: "Resale"}, {value: "Internal", name: "Internal"}].map((cat) => ({ value: cat.value, label: `${cat?.name}` }))}
                    />
                    <ErrorMessage
                      name="category_one"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>)}
                  
                  {createdIncomings.length <= 0 && (
                    <Grid item md={6} xs={12}>
                      <label>Lot Number</label>
                      <Field
                          className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                          maxWidth="sm"
                          placeholder="Lot Number"
                          name="lot_no"
                      />
                      <ErrorMessage
                          name="lot_no"
                          component="div"
                          className="text-warning text-xs"
                      />
                    </Grid>                    
                  )}

                  {createdIncomings.length <= 0 && (
                    <Grid item md={6} xs={12}>
                      <label htmlFor="expiry_date">Expiry Date</label>
                      <Field
                        type="date"
                        id="expiry_date"
                        className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                        placeholder="Expiry Date"
                        name="expiry_date"
                      />
                      <ErrorMessage
                        name="expiry_date"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </Grid>                    
                  )}

                  <Grid item md={12} xs={12}>
                    <label>Quantity approved</label>
                    <Field
                        className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                        maxWidth="sm"
                        placeholder="Quantity Approved"
                        name="quantity_approved"
                        disabled={true}
                    />
                    <ErrorMessage
                        name="quantity_approved"
                        component="div"
                        className="text-warning text-xs"
                    />
                  </Grid>
                    <Grid item md={12} xs={12}>
                    <label>Quantity Received</label>
                    <Field
                        className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                        maxWidth="sm"
                        placeholder="Quantity Received"
                        name="quantity_received"
                    />
                    <ErrorMessage
                        name="quantity_received"
                        component="div"
                        className="text-warning text-xs"
                    />
                    </Grid>
                    <Grid item md={12} xs={12}>
                    <div className="flex items-center justify-end">
                        <button
                        type="submit"
                        className="bg-primary rounded-xl text-sm px-8 py-4 text-white"
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
                        update Item
                        </button>
                    </div>
                    </Grid>
                </Grid>
                </Form>
            </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default UpdateReceivedItemModal;
