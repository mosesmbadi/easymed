import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager,
  HeaderFilter, Scrolling,
 } from "devextreme-react/data-grid";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { MdAddCircle } from "react-icons/md";
import { Chip } from "@mui/material";
import { getAllPatients, getAllProcesses } from "@/redux/features/patients";
import { useSelector,useDispatch } from "react-redux";
import AddTriageModal from './add-triage-modal';
import { getAllDoctors } from "@/redux/features/doctors";
import { useAuth } from "@/assets/hooks/use-auth";
import ProcessFilter from "@/components/common/process/ProcessFilter";


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "add",
      label: "Add Triage",
      icon: <MdAddCircle className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const NursePatientDataGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const userActions = getActions();
  const [open, setOpen] = React.useState(false);
  const [triageOpen, setTriageOpen] = React.useState(false);
  const [selectedRowData, setSelectedRowData] = React.useState({});
  const dispatch = useDispatch();
  const { patients, processes } = useSelector((store) => store.patient);
  const { doctors } = useSelector((store)=> store.doctor)
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [processFilter, setProcessFilter] = useState({ track: "triage", search: "" })
  const auth = useAuth()
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})


  useEffect(() =>{
    if(auth){
      dispatch(getAllPatients(auth));
      dispatch(getAllProcesses(auth))
      dispatch(getAllDoctors(auth))
    }
  },[]);


  const onMenuClick = async (menu, data) => {
    if (menu.action === "add") {
      setSelectedRowData(data);
      setTriageOpen(true);
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

  // filter users based on search query
  const filteredProcesses = processes.filter((process) => process.track.includes(processFilter.track));

  const billedDocSchedules = filteredProcesses.filter(schedule => {
    const hasAppointment = schedule.invoice_items.some(item =>  
        item.category.toLowerCase().includes('appointment') && item.status.toLowerCase() === "billed"
    );
    
    return hasAppointment
  });

  const patientNameRender = (cellData) => {
    const patient = patients.find((patient) => patient.id === cellData.data.patient);
    return patient ? `${patient.first_name} ${patient.second_name}` : ""
  }

  const doctorNameRender = (cellData) => {
    const doctor = doctors.find((doctor) => doctor.id === cellData.data.doctor);
    return doctor ? `${doctor.first_name} ${doctor.last_name}` : ""
  }

  useEffect(() => {
      // This effect handles the debouncing logic
      const timerId = setTimeout(() => {
          // Dispatch the action only after a 500ms delay
          dispatch(getAllProcesses(auth, null, processFilter, selectedSearchFilter))
      }, 500); // 500ms delay, adjust as needed

      // Cleanup function: clears the timer if searchTerm changes before the delay is over
      return () => {
          clearTimeout(timerId);
      };
  }, [processFilter.search]); // The effect re-runs only when the local `searchTerm` state changes

  return (
    <section>
      <ProcessFilter 
        selectedFilter={processFilter} 
        setProcessFilter={setProcessFilter}
        selectedSearchFilter={selectedSearchFilter} 
        setSelectedSearchFilter={setSelectedSearchFilter}
      />
      <DataGrid
        dataSource={billedDocSchedules}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl w-full"
        // height={"70vh"}
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
        <HeaderFilter visible={true} />
        <Column
          dataField="patient_number"
          caption="PId"
        />
        <Column
          dataField="patient"
          caption="Patient Name"
          allowFiltering={true}
          allowSearch={true}
          cellRender={patientNameRender}
        />
        <Column
          dataField="doctor"
          caption="Assigned Doctor"
          allowFiltering={true}
          allowSearch={true}
          cellRender={doctorNameRender}
        />
        <Column
          dataField=""
          caption="Action"
          cellRender={actionsFunc}
        />
      </DataGrid>
      {triageOpen && <AddTriageModal {...{ triageOpen,setTriageOpen,selectedRowData}} />}
    </section>
  );
};

export default NursePatientDataGrid;

