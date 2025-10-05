import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, Scrolling,
 } from "devextreme-react/data-grid";
import { labData, months } from "@/assets/dummy-data/laboratory";
import { Grid } from "@mui/material";
import { LuMoreHorizontal } from "react-icons/lu";
import { AiOutlineDownload } from 'react-icons/ai';
import CmtDropdownMenu from "@/assets/DropdownMenu";
import EquipmentModal from "./equipment-modal";

import RequestInfoModal from "./RequestInfoModal";
import LabModal from "../doctor-desk/lab-modal";
import ProcessFilter from "@/components/common/process/ProcessFilter";
import { getAllProcesses } from "@/redux/features/patients";
import { useAuth } from "@/assets/hooks/use-auth";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    { action: "add", label: "Add Test", icon: <AiOutlineDownload className="text-card text-xl" /> },
    { action: "view", label: "Request Information", icon: <AiOutlineDownload className="text-card text-xl" /> },
  ];
 
  return actions;
};


const LabRequestDataGrid = ( ) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const userActions = getActions();
  const [open,setOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [requestInfoOpen,setRequestInfoOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = React.useState({});
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [processFilter, setProcessFilter] = useState({ track: "lab", search: "" })
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})
  

  const items = [
    {label: "None", value: ""},
    {label: "Patient First Name", value: "patient__first_name"},
    {label: "Patient Second Name", value: "patient__second_name"},
    {label: "Patient Id", value: "patient_number"},
    // {label: "Track Number", value: "track_number"},
    // {label: "Doctor First Name", value: "doctor__first_name"},
    // {label: "Doctor Last Name", value: "doctor__last_name"},
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


  const dispatch = useDispatch();
  const auth = useAuth();
  const { processes, patients } = useSelector((store)=> store.patient)

  const labTestsSchedules = processes.filter((process)=> process.track.includes(processFilter.track))
  const searchedProcesses = labTestsSchedules.filter((process)=> process.patient_number.includes(searchQuery))


  const patientNameRender = (cellData) => {
    const patient = patients.find((patient) => patient.id === cellData.data.patient);
    return patient ? `${patient.first_name} ${patient.second_name}` : ""
  }

  const onMenuClick = async (menu, data) => {
   if (menu.action === "add") {
      setSelectedRowData(data)
      setLabOpen(true)
    }else if(menu.action === 'equipment'){
      setSelectedRowData(data)
      setOpen(true)
    }else if(menu.action === 'view'){
      setSelectedRowData(data)
      setRequestInfoOpen(true)
    }
  };

  const actionsFunc = ({ data }) => {
    return (
      <>
        <CmtDropdownMenu
        sx={{ cursor: "pointer" }}
        items={userActions}
        onItemClick={(menu) => onMenuClick(menu, data)}
        TriggerComponent={<LuMoreHorizontal className="cursor-pointer text-xl" />}
      />
      </>
    );
  };

  // Debounced fetch of processes when the search input changes
  useEffect(() => {
    if (!auth) return; // wait for auth context
    const handler = setTimeout(() => {
      dispatch(getAllProcesses(auth, null, processFilter, selectedSearchFilter));
    }, 500);
    return () => clearTimeout(handler);
  }, [auth, processFilter.search, processFilter.track, selectedSearchFilter?.value]);

  return (
    <>
      <ProcessFilter 
        setProcessFilter={setProcessFilter} 
        selectedFilter={processFilter}
        selectedSearchFilter={selectedSearchFilter} 
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
      />

      {/* DATAGRID STARTS HERE */}
      <DataGrid
        dataSource={searchedProcesses}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={false}
        showRowLines={true}
        wordWrapEnabled={true}
        // allowPaging={true}
        // height={"70vh"}
        className="w-full shadow"
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
        <Column 
          dataField="patient_number" 
          caption="PId" 
        />
        <Column 
          dataField="patient" 
          caption="Patient Name" 
          cellRender={patientNameRender}
        />
        <Column
          dataField=""
          caption=""
          cellRender={actionsFunc}
        />
      </DataGrid>
      {labOpen && (<LabModal {...{ labOpen, setLabOpen, selectedRowData }}/>)}
      {requestInfoOpen && (
        <RequestInfoModal {...{requestInfoOpen, setRequestInfoOpen, selectedRowData}}/>
      )}
    </>
  );
};

export default LabRequestDataGrid;
