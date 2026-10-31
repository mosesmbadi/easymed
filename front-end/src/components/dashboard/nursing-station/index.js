import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Scrolling } from "devextreme-react/data-grid";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { MdAddCircle } from "react-icons/md";
import { Chip } from "@mui/material";
import { useSelector,useDispatch } from "react-redux";
import AddTriageModal from './add-triage-modal';
import { getAllDoctors } from "@/redux/features/doctors";
import { useAuth } from "@/assets/hooks/use-auth";
import ProcessFilter from "@/components/common/process/ProcessFilter";
import ServerPager from "@/components/common/ServerPager";
import { useVisitQueue } from "@/assets/hooks/use-visit-queue";


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

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
  const [processFilter, setProcessFilter] = useState({ track: "triage", search: "" })
  const auth = useAuth()
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})
  // Everyone in triage, and anyone further on whose consultation is billed:
  // worked out on the server (queue=nursing), a page at a time.
  const queue = useVisitQueue({
    queue: "nursing",
    track: processFilter.track,
    search_value: processFilter.search,
    search_field: selectedSearchFilter.value,
  });

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


  useEffect(() =>{
    if(auth){
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
        noDataText={queue.loading ? "Loading patients..." : queue.error || "No patients in this queue"}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        className="shadow-xl w-full"
      >
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        {/* The server sends one page; ServerPager below asks for others. */}
        <Paging enabled={false} />
        <Column
          dataField="patient_number"
          caption="PId"
        />
        <Column
          dataField="patient_name"
          caption="Patient Name"
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
      {triageOpen && <AddTriageModal {...{ triageOpen,setTriageOpen,selectedRowData}} />}
    </section>
  );
};

export default NursePatientDataGrid;

