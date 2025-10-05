import React, { useEffect, useState, } from "react";
import { useParams } from 'next/navigation';
import { useSelector, useDispatch } from "react-redux";
import { Formik, Form, } from "formik";
import { useAuth } from "@/assets/hooks/use-auth";
import { useRouter } from 'next/navigation'
import dynamic from "next/dynamic";
import { Column, Pager } from "devextreme-react/data-grid";
import { Grid, Container } from "@mui/material";
import { createPrescription } from "@/redux/service/patients";
import { prescribeDrug } from "@/redux/service/patients";
import { clearAllPrescriptionItems, getAllPrescribedDrugsByPrescription } from "@/redux/features/patients";
import { removeAPrescriptionItem } from "@/redux/features/patients";
import { toast } from "react-toastify";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { SlMinus } from "react-icons/sl";
import { LuMoreHorizontal } from "react-icons/lu";
import DashboardLayout from '@/components/layout/dashboard-layout';
import PrescriptionItemDialog from "@/components/dashboard/doctor-desk/prescriptionItemDialog";
import ProtectedRoute from "@/assets/hoc/protected-route";
import AuthGuard from "@/assets/hoc/auth-guard";
import PrescribePatient from "@/components/dashboard/prescribe/PrescribePatient";
import { getAllPrescriptionsPrescribedDrugs } from "@/redux/features/pharmacy";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const getActions = () => {
  let actions = [
    {
      action: "remove",
      label: "Remove",
      icon: <SlMinus className="text-success text-xl mx-2" />,
    },
  ];
  
  return actions;
};

const PrescribeDrug = () => {
  const params = useParams();
  const router = useRouter()
  const userActions = getActions();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const { item, } = useSelector(({ inventory }) => inventory);
  const { prescriptionItems } = useSelector(({ patient }) => patient);
  const auth = useAuth();
  let currentDate = new Date();
  let year = currentDate.getFullYear();
  let month = String(currentDate.getMonth() + 1).padStart(2, '0');
  let day = String(currentDate.getDate()).padStart(2, '0');

  const initialValues = {
    status: "pending",
    start_date: `${year}-${month}-${day}`,
  };

  const onMenuClick = async (menu, data) => {
    console.log(data)
    if (menu.action === "remove") {
      dispatch(removeAPrescriptionItem(data))
    }
  };

  const actionsFunc = ({ data }) => {
    return (
      <>
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={userActions}
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={
            <LuMoreHorizontal className="cursor-pointer text-xl" />
          }
        />
      </>
    );
  };


  const savePrescribedDrug = async (item, payload) => {

    const payloadData = {
      ...item,
      patient: parseInt(item.patient),
      prescription:payload.id
    }

    try {
      await prescribeDrug(payloadData, auth).then(()=>{
        toast.success("Prescribed Drug Added Successfully!");
      })

    } catch(err) {
      toast.error(err);
      setLoading(false);
    } 
  }

  const sendEachPrescriptionItemToDb = (payload) => {
    prescriptionItems.forEach(item => savePrescribedDrug(item, payload))
  }

  const savePrescription = async (formValue, helpers) => {

    try {
      if (prescriptionItems.length <= 0) {
        toast.error("No prescribed drugs added");
        return;
      }      
    
      setLoading(true);
    
      const payload = {
        ...formValue,
        created_by: auth.user_id
      }

      console.log(payload)
    
      await createPrescription(payload).then((res) => {
        sendEachPrescriptionItemToDb(res)
        toast.success("Prescription Saved Successfully!");
        setLoading(false);
        dispatch(clearAllPrescriptionItems())
        
        router.push('/dashboard/doctor-desk')
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  useEffect(()=> {
    if(auth){
      dispatch(getAllPrescribedDrugsByPrescription(params.prescription_id, auth))
    }
  }, [])

  return (
    <PrescribePatient/>
  )
}

PrescribeDrug.getLayout = (page) => (
    <ProtectedRoute permission={'CAN_ACCESS_DOCTOR_DASHBOARD'}>
      <AuthGuard>
        <DashboardLayout>{page}</DashboardLayout>
      </AuthGuard>
    </ProtectedRoute>
);

export default PrescribeDrug;