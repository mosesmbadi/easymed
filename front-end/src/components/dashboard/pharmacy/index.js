import React, {useEffect, useState} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { MdLocalPrintshop } from 'react-icons/md'
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling } from "devextreme-react/data-grid";
import { Grid } from "@mui/material";
import { months } from "@/assets/dummy-data/laboratory";
import { getAllPrescriptions, getAllPrescribedDrugs, getAllPrescriptionsPrescribedDrugs } from "@/redux/features/pharmacy";
import { getAllDoctors } from "@/redux/features/doctors";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { downloadPDF } from '@/redux/service/pdfs';
import { getAllPatients, getAllProcesses } from "@/redux/features/patients";


import CmtDropdownMenu from "@/assets/DropdownMenu";
import { MdAddCircle } from "react-icons/md";
import { LuMoreHorizontal } from "react-icons/lu";
import ViewPrescribedDrugsModal from "./view-prescribed-drugs-modal";
import { GiMedicinePills } from "react-icons/gi";
import ProcessFilter from "@/components/common/process/ProcessFilter";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "prescribe",
      label: "Prescribe",
      icon: <GiMedicinePills className="text-card text-xl mx-2" />,
    },
    {
      action: "dispense",
      label: "Dispense",
      icon: <MdAddCircle className="text-success text-xl mx-2" />,
    },
    {
      action: "print",
      label: "Print",
      icon: <MdLocalPrintshop className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const PharmacyDataGrid = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const userActions = getActions();
  const router = useRouter();
  const [open,setOpen] = useState(false)
  const prescriptionsData = useSelector((store)=>store.prescription)
  const { doctors } = useSelector((store)=>store.doctor)
  const [selectedRowData,setSelectedRowData] = useState({});
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const { processes, patients } = useSelector((store)=> store.patient)
  const [processsFilter, setProcessFilter] = useState({ track: "pharmacy", search: "" })
  const filteredProcesses = processes.filter((process) => process.track.includes(processsFilter.track));
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})

  const items = [
    {label: "None", value: ""},
    {label: "Patient First Name", value: "patient__first_name"},
    {label: "Patient Second Name", value: "patient__second_name"},
    {label: "Patient Id", value: "patient_number"},
    // {label: "Track Number", value: "track_number"},
    {label: "Doctor First Name", value: "doctor__first_name"},
    {label: "Doctor Last Name", value: "doctor__last_name"},
    // {label: "Lab Tech First Name", value: "lab_tech__first_name"},
    // {label: "Lab Tech Last Name", value: "lab_tech__last_name"},
    // {label: "Pharmacist First Name", value: "pharmacist__first_name"},
    // {label: "Pharmacist Last Name", value: "pharmacist__last_name"},
    // {label: "Reason", value: "reason"},
    // {label: "Diagnosis", value: "clinical_note__diagnosis"},
    // {label: "Doctors Notes", value: "clinical_note__doctors_note"},
    // {label: "Signs And Symptoms", value: "clinical_note__signs_and_symptoms"},
    // {label: "Test Profile Name", value: "process_test_req__attendace_test_requests__test_profile__name"},
    // {label: "Prescribed Drug Name", value: "prescription__attendance_prescribed_drugs__item__name"},
  ]
    

  const searchedProcesses = filteredProcesses.filter((process)=> process.patient_number.includes(searchQuery))

  const patientNameRender = (cellData) => {
    const patient = patients.find((patient) => patient.id === cellData.data.patient);
    return patient ? `${patient.first_name} ${patient.second_name}` : ""
  }

  const doctorNameRender = (cellData) => {
    const doctor = doctors.find((doctor) => doctor.id === cellData.data.doctor);
    return doctor ? `${doctor.first_name} ${doctor.last_name}` : ""
  }

  const dispatch = useDispatch();
  const auth = useAuth();

  const handlePrint = async (data) => {

    try{
        const response = await downloadPDF(data.prescription, "_prescription_pdf", auth)
        window.open(response.link, '_blank');
        toast.success("got pdf successfully")

    }catch(error){
        console.log(error)
        toast.error(error)
    }      
  };


  useEffect(() => {
    if (auth) {
      dispatch(getAllPrescriptions(auth));
      dispatch(getAllPrescribedDrugs(auth));
      dispatch(getAllDoctors(auth));
      dispatch(getAllPatients(auth))
      dispatch(getAllProcesses(auth))
    }
  }, [auth]);

  const onMenuClick = async (menu, data) => {
    if (menu.action === "dispense") {
      dispatch(getAllPrescriptionsPrescribedDrugs(data.prescription, auth))
      setSelectedRowData(data);
      setOpen(true);
    }else if (menu.action === "print"){
      handlePrint(data);
    }else if (menu.action === "prescribe") {
      router.push(`/dashboard/doctor-desk/${data.id}/${data.prescription}`);
    }
  };

  const actionsFunc = ({ data }) => {
    return (
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={userActions}
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={
            <LuMoreHorizontal className="cursor-pointer text-xl" />
          }
        />
    );
  };

  useEffect(() => {
      // This effect handles the debouncing logic
      const timerId = setTimeout(() => {
          // Dispatch the action only after a 500ms delay
          dispatch(getAllProcesses(auth, null, processsFilter, selectedSearchFilter))
      }, 500); // 500ms delay, adjust as needed

      // Cleanup function: clears the timer if searchTerm changes before the delay is over
      return () => {
          clearTimeout(timerId);
      };
  }, [processsFilter.search]); // The effect re-runs only when the local `searchTerm` state changes

  return (
    <section className=" my-0">
      <ProcessFilter 
        setProcessFilter={setProcessFilter} 
        selectedFilter={processsFilter}
        selectedSearchFilter={selectedSearchFilter} 
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
      />
      <DataGrid
        dataSource={searchedProcesses}
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
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showInfo={showInfo}
          showNavigationButtons={showNavButtons}
        />
        <Column width={120} dataField="patient_number" caption="PID" />
        <Column 
          dataField="patient" 
          caption="Patient Name"
          cellRender={patientNameRender} 
        />
        <Column 
          dataField="doctor" 
          caption="Doctor"
          cellRender={doctorNameRender}        
        />
        <Column 
          dataField="" 
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      {open && <ViewPrescribedDrugsModal {...{setOpen,open,selectedRowData}} />}
    </section>
  );
};

export default PharmacyDataGrid;
