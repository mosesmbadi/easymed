import React, { useEffect } from "react";
import { useRouter } from 'next/navigation'
import { useDispatch } from "react-redux";
import { getAllItems, getAllSuppliers, getItems, getAllPurchaseOrders } from "@/redux/features/inventory";
import { useAuth } from "@/assets/hooks/use-auth";
import POListGrid from "./POListGrid";

const NewItems = ({ heading = 'Add New Incoming Item' }) => {

    const dispatch = useDispatch();
    const router = useRouter()
    const auth = useAuth();

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