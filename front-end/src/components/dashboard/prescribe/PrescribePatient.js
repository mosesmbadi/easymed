import React, { useEffect, useState, } from "react";
import { useParams } from 'next/navigation';
import { usePathname } from 'next/navigation'
import { useSelector, useDispatch } from "react-redux";
import { Formik, Form, } from "formik";
import { useAuth } from "@/assets/hooks/use-auth";
import { useRouter } from 'next/navigation'
import dynamic from "next/dynamic";
import { Column, Pager } from "devextreme-react/data-grid";
import { Grid, Container } from "@mui/material";
import { createPrescription, fetchPatientById, updateAttendanceProcesses, updatePrescription } from "@/redux/service/patients";
import { prescribeDrug } from "@/redux/service/patients";
import { clearAllPrescriptionItems, getAllProcesses } from "@/redux/features/patients";
import { removeAPrescriptionItem } from "@/redux/features/patients";
import { toast } from "react-toastify";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { SlMinus } from "react-icons/sl";
import { LuMoreHorizontal } from "react-icons/lu";
import DashboardLayout from '@/components/layout/dashboard-layout';
import PrescriptionItemDialog from "@/components/dashboard/doctor-desk/prescriptionItemDialog";
import ProtectedRoute from "@/assets/hoc/protected-route";
import AuthGuard from "@/assets/hoc/auth-guard";
import { billingInvoiceItems } from "@/redux/service/billing";

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

const PrescribePatient = () => {
  const params = useParams();
  const router = useRouter()
  const pathname = usePathname()
  const userActions = getActions();
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const { item, } = useSelector(({ inventory }) => inventory);
  const { prescriptionItems } = useSelector(({ patient }) => patient);
  const { prescriptionsPrescribed, prescriptions } = useSelector((store) => store.prescription);
  const { processes, patients } = useSelector((store)=> store.patient);
  const thisProcess = processes.find((process)=> process.id === parseInt(params.process_id))
  const auth = useAuth();
  let currentDate = new Date();
  let year = currentDate.getFullYear();
  let month = String(currentDate.getMonth() + 1).padStart(2, '0');
  let day = String(currentDate.getDate()).padStart(2, '0');
  const [patient, setPatient]=useState({})

  const getPatientDetailsForThisTestRequest = async () => {
      try{
          const response = await fetchPatientById(thisProcess?.patient, auth)
          setPatient(response);
      }catch(error){
          console.log("ERROR GETTING PATIENT")
      }
  }

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

  useEffect(()=> {
    if(auth){
      getAllProcesses(auth)
      getPatientDetailsForThisTestRequest()
    }
  }, [thisProcess])

  console.log("THE PATH HERE IS", pathname)

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
      // patient: parseInt(item.patient),
      prescription:payload.id
    }

    const invoiceItemPayload = {
      item: parseInt(item.item),
      invoice: parseInt(thisProcess.invoice)
    }

    try {
      await prescribeDrug(payloadData, auth).then(()=>{
        billingInvoiceItems(auth, invoiceItemPayload)
        toast.success("Prescribed Drug Added Successfully!");
      })

    } catch(err) {
      toast.error(err);
      setLoading(false);
    } 
  }

  const sendEachPrescriptionItemToDb = (payload) => {
    console.log("RESPONSE AFTER UPDATE", payload)
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
    
      await updatePrescription(params.prescription_id, payload,  auth).then((res) => {
        updateAttendanceProcesses({track: "pharmacy"}, params.process_id, auth)
        sendEachPrescriptionItemToDb(res)
        toast.success("Prescription Saved Successfully!");
        setLoading(false);
        dispatch(clearAllPrescriptionItems())
        
        router.push(`${pathname.includes('doctor-desk') ? '/dashboard/doctor-desk' : '/dashboard/patients' }`)
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };
  return (
    <Container className="mt-10">
    <section>
    {patient && (
      <div className="grid grid-cols-2 gap-4 mb-8 bg-[#F5F5F5] p-2">
        <p className="text-xs font-semibold">{`Name: ${patient?.first_name} ${patient?.second_name}`}</p>
        <p className="text-xs font-semibold">{`UID: ${patient?.unique_id}`}</p>
        <p className="text-xs font-semibold">{`Gender: ${patient?.gender}`}</p>
        <p className="text-xs font-semibold">{`Age: ${patient?.age}`}</p>
      </div>
    )}
    <div className="flex gap-4 mb-4 items-center">
        <img onClick={() => router.back()} className="h-3 w-3 cursor-pointer" src="/images/svgs/back_arrow.svg" alt="go back"/>
        <h3 className="text-xl"> patient prescription </h3>
    </div>
    <div className="flex items-center justify-end">
        <PrescriptionItemDialog patient={patient} patient_id={params?.patient_id}/>
    </div>

    <Formik
      initialValues={initialValues}
      onSubmit={savePrescription}
    >
    <Form className="">
    <DataGrid
      dataSource={prescriptionItems}
      allowColumnReordering={true}
      rowAlternationEnabled={true}
      showBorders={true}
      remoteOperations={true}
      showColumnLines={true}
      showRowLines={true}
      wordWrapEnabled={true}
      allowPaging={true}
      className="shadow-xl"
    >
      <Pager
        visible={false}
        showPageSizeSelector={true}
        showNavigationButtons={true}
      />
      <Column
        dataField="item" 
        caption="Item Name" 
        cellRender={(cellData) => {
          const productItem = item.find(item => item.id === cellData.data.item);
          return productItem ? `${productItem.name}` : 'null';
        }}
      />
      <Column 
        dataField="dosage" 
        caption="Dosage" 
      />
      <Column 
        dataField="frequency" 
        caption="Frequency"       
      />
      <Column 
        dataField="duration" 
        caption="Duration"
      />
      <Column 
        dataField="note" 
        caption="Note"
      />
      <Column 
        dataField="" 
        caption=""
        cellRender={actionsFunc}
      />
    </DataGrid>

    <Grid className="mt-8" item md={12} xs={12}>
      <div className="flex items-center justify-start">
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
          Save Prescription
        </button>
      </div>
    </Grid>
    </Form>
    </Formik>
  </section>
  </Container>
  )
}

export default PrescribePatient