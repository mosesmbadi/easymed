import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager,
  HeaderFilter, Scrolling,
 } from "devextreme-react/data-grid";
import { Chip } from "@mui/material";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import ReferPatientModal from "../patient/refer-patient-modal";
import ConsultPatientModal from "./consult-modal";
import PrescribePatientModal from "./prescribe-patient-modal";
import { BiTransferAlt } from "react-icons/bi";
import { FaBed } from "react-icons/fa";
import { MdOutlineContactSupport } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { getAllPatients, getAllProcesses } from "@/redux/features/patients";
import { useAuth } from "@/assets/hooks/use-auth";
import { BiSupport } from 'react-icons/bi'
import { GiMedicinePills } from 'react-icons/gi'
import { useRouter } from "next/router";
import LabModal from "./lab-modal";
import ViewAddedResults from "./ViewAddedResults";
import ApproveResults from "../laboratory/add-result/ApproveResults";
import ProcessFilter from "@/components/common/process/ProcessFilter";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "refer",
      label: "Refer Patient",
      icon: <BiTransferAlt className="text-card text-xl mx-2" />,
    },
    {
      action: "consult",
      label: "Consult",
      icon: <BiSupport className="text-card text-xl mx-2" />,
    },
    {
      action: "admit",
      label:"Admit",
      icon:<FaBed className="text-card text-xl mx-2"/>,
    },
    {
      action: "prescribe",
      label: "Prescribe",
      icon: <GiMedicinePills className="text-card text-xl mx-2" />,
    },
    {
      action: "send to lab",
      label: "Send To Lab",
      icon: <MdOutlineContactSupport className="text-card text-xl mx-2" />,
    },
    {
      action: "results",
      label: "View results",
      icon: <MdOutlineContactSupport className="text-card text-xl mx-2" />,
    },
  ];

  return actions;
};

const DoctorPatientDataGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectedRowData, setSelectedRowData] = React.useState({});
  const [open, setOpen] = useState(false);
  const [resultOpen, setResultOpen]=useState(false)
  const [consultOpen, setConsultOpen] = useState(false);
  const [prescribeOpen, setPrescribeOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const userActions = getActions();
  const dispatch = useDispatch();
  const auth = useAuth();
  const router = useRouter();
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const { processes, patients } = useSelector((store)=> store.patient)
  const [processFilter, setProcessFilter] = useState("doctor")
  const actionsWhenOnDoctorTrack = userActions.filter((action)=> action.action !== "results")
  const actionsWhenOnResultedTrack = userActions.filter((action)=> action.action !== "send to lab")

  const doctorsSchedules = processes.filter((process)=> process.track.includes(processFilter))

  const patientNameRender = (cellData) => {
    const patient = patients.find((patient) => patient.id === cellData.data.patient);
    return patient ? `${patient.first_name} ${patient.second_name}` : ""
  }

  useEffect(() => {
    if (auth) {
      dispatch(getAllPatients(auth));
      dispatch(getAllProcesses(auth))
    }
  }, [auth]);

  const onMenuClick = async (menu, data) => {
    if (menu.action === "refer") {
      setSelectedRowData(data);
      setOpen(true);
    } else if (menu.action === "consult") {
      setSelectedRowData(data);
      setConsultOpen(true);
    } else if (menu.action === "prescribe") {
      router.push(`/dashboard/doctor-interface/${data.id}/${data.prescription}`);
    } else if(menu.action === "send to lab"){
      setSelectedRowData(data);
      setLabOpen(true);
    }else if(menu.action === "results"){
      setSelectedRowData(data);
      setResultOpen(true);
    }
  };

  const actionsFunc = ({ data }) => {
    return (
      <>
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={processFilter === 'lab' ?  actionsWhenOnResultedTrack : actionsWhenOnDoctorTrack }
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={
            <LuMoreHorizontal className="cursor-pointer text-xl" />
          }
        />
      </>
    );
  };

  const onSelectionChanged = (props) => {
    const { selectedRowKeys } = props;
    setSelectedRecords(selectedRowKeys);
  };

  return (
    <section>
      {/* <div className="capitalize flex gap-4 py-4">
        <p className="cursor-pointer text-primary border-b border-primary px-2" onClick={()=> setProcessTrack("doctor")}>New Appointments</p>
        <p className="cursor-pointer text-primary border-b border-primary px-2" onClick={()=> setProcessTrack("lab")}>From The Lab</p>
      </div> */}
      <ProcessFilter selectedFilter={processFilter} setProcessFilter={setProcessFilter}/>
      <DataGrid
        dataSource={doctorsSchedules}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        onSelectionChanged={onSelectionChanged}
        selectedRowKeys={selectedRecords}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl w-full"
        // height={"70vh"}
      >
        <HeaderFilter visible={true} />
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
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="patient"
          caption="Patient Name"
          allowFiltering={true}
          allowSearch={true}
          cellRender={patientNameRender}
        />
        <Column dataField="reason" caption="Reason" width={200} />
        <Column
          dataField=""
          caption="Action"
          cellRender={actionsFunc}
        />
      </DataGrid>
      {open && (<ReferPatientModal {...{ open, setOpen, selectedRowData }} />)}
      {consultOpen && (<ConsultPatientModal
        {...{ consultOpen, setConsultOpen, selectedRowData }}
      />)}
      {prescribeOpen && (<PrescribePatientModal
        {...{ prescribeOpen, setPrescribeOpen, selectedRowData }}
      />)}
      {labOpen && (<LabModal
        {...{ labOpen, setLabOpen, selectedRowData }}
      />)}
      {/* {resultOpen && (<ViewAddedResults resultOpen={resultOpen} setResultOpen={setResultOpen} selectedData={selectedRowData}
      />)} */}
      {resultOpen && (<ApproveResults selectedData={selectedRowData} approveOpen={resultOpen} setApproveOpen={setResultOpen}/>)}
    </section>
  );
};

export default DoctorPatientDataGrid;
