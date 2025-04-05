import React, { useEffect, useState } from "react";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import * as Yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { getAllItems, getItems, getAllSuppliers, addItemToInventoryList } from "@/redux/features/inventory";
import { toast } from "react-toastify";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import SeachableSelect from "@/components/select/Searchable";
import { useAuth } from "@/assets/hooks/use-auth";

const AddRequisitionItemModal = () => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth()
  const { item, suppliers, inventoryItems } = useSelector(({ inventory }) => inventory);

  console.log(inventoryItems)


  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };


  const initialValues = {
    date_created: "",
    item: null,
    preferred_supplier: null,
    quantity_requested: "",
  };

  const validationSchema = Yup.object().shape({
    item: Yup.object().required("This field is required!"),
    preferred_supplier: Yup.object().required("This field is required!"),
    quantity_requested: Yup.string().required("This field is required!"),
  });

  const handleAddRequisition = async (formValue, helpers) => {
    let currentDate = new Date();
    let year = currentDate.getFullYear();
    let month = String(currentDate.getMonth() + 1).padStart(2, '0');
    let day = String(currentDate.getDate()).padStart(2, '0');
    try {
      const formData = {
        ...formValue,
        preferred_supplier: formValue.preferred_supplier.value,
        item: formValue.item.value,
      };

      setLoading(true);    
      dispatch(addItemToInventoryList(formData))
      setLoading(false);
      handleClose()

    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   if(auth.token){
  //     dispatch(getAllItems(auth));
  //     dispatch(getItems(auth))
  //     dispatch(getAllSuppliers(auth));
  //   }    
  // }, [auth]);

  return (
    <section>
      <button onClick={handleClickOpen} className="bg-primary text-white text-sm rounded px-3 py-2">
        Add Requisition Item
      </button>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <h3 className="text-xl my-4"> Add Requisition Item </h3>
        <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleAddRequisition}
      >
        <Form className="">
          <Grid container spacing={4}>
                        <Grid className='my-2' item md={12} xs={12}>
              <SeachableSelect
                label="Select Item"
                name="item"
                options={item.map((item) => ({ value: item.id, label: `${item?.name}` }))}
              />
              <ErrorMessage
                name="item"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>
            <Grid className='my-2' item md={12} xs={12}>
              <SeachableSelect
                label="Select Supplier"
                name="preferred_supplier"
                options={suppliers.map((supplier) => ({ value: supplier.id, label: `${supplier?.official_name}` }))}
              />
              <ErrorMessage
                name="preferred_supplier"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>
            <Grid item md={12} xs={12}>
              <Field
                className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="Quantity"
                name="quantity_requested"
              />
              <ErrorMessage
                name="quantity_requested"
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
                  Add Item
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

export default AddRequisitionItemModal;
