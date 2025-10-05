import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation'
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import * as Yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { getAllItems, getAllSuppliers, getItems, getAllPurchaseOrders } from "@/redux/features/inventory";
import { addIncomingItem } from "@/redux/service/inventory";
import { toast } from "react-toastify";
import SeachableSelect from "@/components/select/Searchable";
import { useAuth } from "@/assets/hooks/use-auth";
import POListGrid from "./POListGrid";

const NewItems = ({ heading = 'Add New Incoming Item', redirectToList }) => {

    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();
    const router = useRouter()
    const { item, suppliers, purchaseOrders } = useSelector((store) => store.inventory);
    const auth = useAuth();
  
  
    const initialValues = {
      quantity: "",
      packed: "",
      subpacked: "",
      purchase_price: "",
      sale_price: "",
      item: "",
      supplier:"",
      purchase_order: "",
      category_one: null,
    };
  
    const validationSchema = Yup.object().shape({
      quantity: Yup.string().required("This field is required!"),
      packed: Yup.string().required("This field is required!"),
      subpacked: Yup.string().required("This field is required!"),
      purchase_price: Yup.string().required("This field is required!"),
      sale_price: Yup.string().required("This field is required!"),
      item: Yup.object().required("This field is required!"),
      supplier: Yup.object().required("This field is required!"),
      purchase_order: Yup.object().required("This field is required!"),
      category_one: Yup.object().required("This field is required!"),
    });
  
    const handleAddIncomingItems = async (formValue, helpers) => {
      try {

        setLoading(true);

        const formData = {
          ...formValue,
          item: parseInt(formValue.item.value),
          category_one: formValue.category_one.label,
          supplier: parseInt(formValue.supplier.value),
          purchase_order: parseInt(formValue.purchase_order.value)
        };
  
        await addIncomingItem(formData, auth).then((res)=>{
          console.log(res)
           helpers.resetForm();
           toast.success("Item Added Successfully!");
           setLoading(false);
           // Prefer explicit redirect prop; fallback to legacy inventory path
           router.push(redirectToList || '/dashboard/inventory/incoming-items')
        })
      } catch (err) {
        toast.error(err);
        setLoading(false);
      }
    };
  
    useEffect(() => {
      if(auth.token){
        dispatch(getAllSuppliers(auth));
        dispatch(getAllItems(auth));
        dispatch(getItems(auth));
        dispatch(getAllPurchaseOrders(auth));
      }
    }, [auth]);

  return (
    <section>
        <div className="flex items-center gap-4 mb-8">
        {/* <Link href='/dashboard/inventory'><img className="h-3 w-3" src="/images/svgs/back_arrow.svg" alt="return to inventory"/></Link> */}
        <img onClick={() => router.back()} className="h-3 w-3 cursor-pointer" src="/images/svgs/back_arrow.svg" alt="go back"/>
  <h3 className="text-xl"> {heading} </h3>
        </div>
        <POListGrid/>
    </section>
  )
}

export default NewItems