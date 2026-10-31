import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Scrolling } from "devextreme-react/data-grid";
import ServerPager from "@/components/common/ServerPager";
import { useVisitQueue } from "@/assets/hooks/use-visit-queue";
import { Chip } from "@mui/material";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import ReferPatientModal from "../patient/refer-patient-modal";
import ConsultPatientModal from "./consult-modal";
import PrescribePatientModal from "./prescribe-patient-modal";
import { BiTransferAlt } from "react-icons/bi";
import { FaBed, FaRobot, FaExclamationTriangle, FaFlask } from "react-icons/fa";
import { MdOutlineContactSupport } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { BiSupport } from 'react-icons/bi'
import { GiMedicinePills } from 'react-icons/gi'
import { useRouter } from "next/router";
import LabModal from "./lab-modal";
import ViewAddedResults from "./ViewAddedResults";
import ApproveResults from "../laboratory/add-result/ApproveResults";
import ProcessFilter from "@/components/common/process/ProcessFilter";
import AdmitModal from "./admit-modal";
import AITriageModal from "./ai-triage-modal";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});


const getActions = () => {
  let actions = [
    {
      action: "refer",
      label: "Refer Patient",
      icon: <BiTransferAlt className="text-card text-xl mx-2" />,
    },
    {
      action: "consult",
      label: "Clinical Notes",
      icon: <BiSupport className="text-card text-xl mx-2" />,
    },
    {
      action: "admit",
      label: "Admit",
      icon: <FaBed className="text-card text-xl mx-2" />,
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
  const [resultOpen, setResultOpen] = useState(false)
  const [consultOpen, setConsultOpen] = useState(false);
  const [prescribeOpen, setPrescribeOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [aiTriageOpen, setAiTriageOpen] = useState(false);
  const userActions = getActions();
  const dispatch = useDispatch();
  const auth = useAuth();
  const router = useRouter();
  const [processFilter, setProcessFilter] = useState({ track: 'doctor', search: "" });
  const actionsWhenOnDoctorTrack = userActions;
  const actionsWhenOnResultedTrack = userActions.filter((action) => action.action !== "send to lab");
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({ label: "", value: "" })
  // This doctor's queue (or the lab tab), filtered and paged on the server.
  const queue = useVisitQueue({
    track: processFilter.track,
    search_value: processFilter.search,
    search_field: selectedSearchFilter.value,
  });

  const items = [
    { label: "None", value: "" },
    { label: "Patient First Name", value: "patient__first_name" },
    { label: "Patient Second Name", value: "patient__second_name" },
    { label: "Patient Id", value: "patient_number" },
    // {label: "Track Number", value: "track_number"},
    { label: "Doctor First Name", value: "doctor__first_name" },
    { label: "Doctor Last Name", value: "doctor__last_name" },
    // {label: "Lab Tech First Name", value: "lab_tech__first_name"},
    // {label: "Lab Tech Last Name", value: "lab_tech__last_name"},
    // {label: "Pharmacist First Name", value: "pharmacist__first_name"},
    // {label: "Pharmacist Last Name", value: "pharmacist__last_name"},
    { label: "Reason", value: "reason" },
    // {label: "Diagnosis", value: "clinical_note__diagnosis"},
    // {label: "Doctors Notes", value: "clinical_note__doctors_note"},
    // {label: "Signs And Symptoms", value: "clinical_note__signs_and_symptoms"},
    // {label: "Test Profile Name", value: "process_test_req__attendace_test_requests__test_profile__name"},
    // {label: "Prescribed Drug Name", value: "prescription__attendance_prescribed_drugs__item__name"},
  ]


  const patientNameRender = (cellData) => {
    const hasCriticalTriage = cellData.data.has_critical_triage;
    const hasApprovedLabResults = cellData.data.has_approved_lab_results;
    return (
      <div className="flex items-center gap-2">
        <span>{cellData.data.patient_name}</span>
        {hasCriticalTriage && (
          <FaExclamationTriangle className="text-warning text-sm" title="Critical Triage Values Detected" />
        )}
        {hasApprovedLabResults && (
          <FaFlask className="text-success text-sm" title="Approved Lab Results Available" />
        )}
      </div>
    );
  }


  const onMenuClick = async (menu, data) => {
    if (menu.action === "refer") {
      setSelectedRowData(data);
      setOpen(true);
    } else if (menu.action === "consult") {
      setSelectedRowData(data);
      setConsultOpen(true);
    } else if (menu.action === "prescribe") {
      router.push(`/dashboard/doctor-desk/${data.id}/${data.prescription}`);
    } else if (menu.action === "send to lab") {
      setSelectedRowData(data);
      setLabOpen(true);
    } else if (menu.action === "results") {
      setSelectedRowData(data);
      setResultOpen(true);
    } else if (menu.action === "admit") {
      setSelectedRowData(data);
      setAdmitOpen(true);
    }
  };

  const handleAITriageClick = (data) => {
    setSelectedRowData(data);
    setAiTriageOpen(true);
  };

  const robotIconFunc = ({ data }) => {
    return (
      <div className="flex justify-center">
        <FaRobot
          className="cursor-pointer text-purple-600 hover:text-purple-800 text-xl transition-colors duration-200"
          onClick={() => handleAITriageClick(data)}
          title="AI Triage Analysis"
        />
      </div>
    );
  };

  const actionsFunc = ({ data }) => {
    return (
      <>
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={processFilter.track === 'lab' ? actionsWhenOnResultedTrack : actionsWhenOnDoctorTrack}
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
      <ProcessFilter
        selectedFilter={processFilter}
        setProcessFilter={setProcessFilter}
        selectedSearchFilter={selectedSearchFilter}
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
      />
      <DataGrid
        dataSource={queue.rows}
        noDataText={queue.loading ? "Loading..." : queue.error || "No patients in this queue"}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        onSelectionChanged={onSelectionChanged}
        selectedRowKeys={selectedRecords}
        showBorders={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        className="shadow-xl w-full"
      // height={"70vh"}
      >
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        {/* The server sends one page; ServerPager below asks for others. */}
        <Paging enabled={false} />
        <Column
          dataField="patient_number"
          caption="PId"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="assigned_doctor"
          caption="Assigned Doctor"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="patient_name"
          caption="Patient Name"
          allowFiltering={true}
          allowSearch={true}
          cellRender={patientNameRender}
        />
        <Column dataField="reason" caption="Reason" width={200} />
        <Column
          dataField=""
          caption="AI"
          width={60}
          cellRender={robotIconFunc}
          allowFiltering={false}
          allowSearch={false}
        />
        <Column
          dataField=""
          caption="Action"
          cellRender={actionsFunc}
        />
      </DataGrid>
      <ServerPager
        page={queue.page}
        pageSize={queue.pageSize}
        total={queue.total}
        loading={queue.loading}
        onPageChange={queue.setPage}
        onPageSizeChange={queue.setPageSize}
      />
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
      {resultOpen && (<ApproveResults selectedData={selectedRowData} approveOpen={resultOpen} setApproveOpen={setResultOpen} />)}

      {admitOpen && (<AdmitModal admitOpen={admitOpen} setAdmitOpen={setAdmitOpen} selectedRowdata={selectedRowData} />)}

      {aiTriageOpen && (<AITriageModal
        open={aiTriageOpen}
        setOpen={setAiTriageOpen}
        selectedRowData={selectedRowData}
      />)}
    </section>
  );
};

export default DoctorPatientDataGrid;
