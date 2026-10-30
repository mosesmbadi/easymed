import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdmitted } from "@/redux/features/inpatient";
import { useAuth } from "@/assets/hooks/use-auth";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { BiEdit } from "react-icons/bi";
import { MdPersonRemove } from "react-icons/md";
import { TbListDetails } from "react-icons/tb";
import EditAdmission from "./modals/UpdateAdmissionModal";
import { useRouter } from "next/router";
import DispatchPatientModal from "./modals/DispatchPatientModal";
import { admitPatient } from "@/redux/service/inpatient";
import SearchOnlyFilter from "@/components/common/process/SearchOnly";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "update",
      label: "Update Admission",
      icon: <BiEdit className="text-success text-xl mx-2" />,
    },
    {
      action: "procedures",
      label: "Patient Procedures",
      icon: <TbListDetails className="text-success text-xl mx-2" />,
    },
    {
      action: "discharge",
      label: "Discharge Patient",
      icon: <MdPersonRemove className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const AdmitPatientDataGrid = ({ward_id=""}) => {
  const showPageSizeSelector = true;
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState({});
  const showInfo = true;
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const { patients } = useSelector((store) => store.inpatient);
  const dispatch = useDispatch();
  const auth = useAuth();
  const userActions = getActions();
  const router = useRouter()
  const [processFilter, setProcessFilter] = useState({ search: "" });
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})

    //   search_fields = [
    //     'patient__first_name', 'patient__second_name', 'admission_id',
    //     'ward__name', 'bed__bed_number', 'admitted_by__first_name', 'admitted_by__last_name',
    //     'reason_for_admission'
    // ]

  const items = [
    {label: "None", value: ""},
    {label: "Patient First Name", value: "patient__first_name"},
    {label: "Patient Second Name", value: "patient__second_name"},
    {label: "Patient Id", value: "patient_number"},
    {label: "Admission Id", value: "admission_id"},
    {label: "Admitted By First Name", value: "admitted_by__first_name"},
    {label: "Admitted By Last Name", value: "admitted_by__last_name"},
    {label: "Ward Name", value: "ward__name"},
    {label: "Bed Number", value: "bed__bed_number"},
    // {label: "Pharmacist First Name", value: "pharmacist__first_name"},
    // {label: "Pharmacist Last Name", value: "pharmacist__last_name"},
    {label: "Reason For Admission", value: "reason_for_admission"},
    // {label: "Diagnosis", value: "clinical_note__diagnosis"},
    // {label: "Doctors Notes", value: "clinical_note__doctors_note"},
    // {label: "Signs And Symptoms", value: "clinical_note__signs_and_symptoms"},
    // {label: "Test Profile Name", value: "process_test_req__attendace_test_requests__test_profile__name"},
    // {label: "Prescribed Drug Name", value: "prescription__attendance_prescribed_drugs__item__name"},

  ]

  const onMenuClick = async (menu, data) => {
    if(menu.action === "update"){
      setSelectedRowData(data);
      setEditOpen(true);      
    }else if(menu.action === "procedures"){
      // Handle procedures action here
      router.push(`/dashboard/admit/patients/${data.attendance_process}/${data.id}`)
    }else if(menu.action === "discharge"){
      // Handle discharge action here
      setShowDispatchModal(true);
      setSelectedRowData(data);
    }
  };

  const actionsFunc = ({ data }) => {
    return (
      <>
        <CmtDropdownMenu
          sx={{ cursor: "pointer" }}
          items={data.discharged.toLowerCase() === "pending" ? userActions : userActions.filter(item => item.action === "procedures")}
          onItemClick={(menu) => onMenuClick(menu, data)}
          TriggerComponent={
            <LuMoreHorizontal className="cursor-pointer text-xl" />
          }
        />
      </>
    );
  };

  // dummy functions and values for now
  const onSelectionChanged = () => {};
  const selectedRecords = [];

  const patientNameRender = (cellData) => {
    return `${cellData.data.patient_first_name} ${cellData.data.patient_second_name}`
  }

  const statusRender = (cellData) => {
    return `${cellData.data.discharged} Discharge`
  }


  const renderBed = (cellData) => {
    return cellData.data.bed ?  `${cellData.data.bed} ` : 'Not Assigned'
  }


  const renderWard = (cellData) => {
    return cellData.data.ward ? `${cellData.data.ward} ` : 'Not Assigned' 
   }

  // useEffect(() => {
  //   if(auth.token){
  //     dispatch(fetchAdmitted(auth, ward_id));
  //   }
  // }, [auth])

  useEffect(() => {
      // This effect handles the debouncing logic
      const timerId = setTimeout(() => {
          // Dispatch the action only after a 500ms delay
          dispatch(fetchAdmitted(auth, ward_id, '', processFilter, selectedSearchFilter))
      }, 500); // 500ms delay, adjust as needed

      // Cleanup function: clears the timer if searchTerm changes before the delay is over
      return () => {
          clearTimeout(timerId);
      };
  }, [processFilter.search]); // The effect re-runs only when the local `searchTerm` state changes

  return (
    <section>
      <SearchOnlyFilter 
        selectedFilter={processFilter} 
        setProcessFilter={setProcessFilter}
        selectedSearchFilter={selectedSearchFilter} 
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
      />
      
      <DataGrid
        dataSource={patients}
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
      >
        <HeaderFilter visible={true} />
        <Scrolling rowRenderingMode="virtual" />
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showInfo={showInfo}
          showNavigationButtons={showNavButtons}
        />
        <Column
          dataField="admission_id"
          caption="Admission ID"
          width={150}
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="patient"
          caption="Name"
          allowFiltering={true}
          allowSearch={true}
          cellRender={patientNameRender}
        />
        <Column
          dataField="patient_age"
          caption="Age"
          width={80}
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="patient_gender"
          caption="Gender"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="reason_for_admission" caption="Reason" />
        <Column 
          dataField="ward" 
          caption="Ward" 
          cellRender={renderWard}
        />
        <Column 
          dataField="bed" 
          caption="Bed"
          cellRender={renderBed}
        />
        <Column width={150} dataField="admitted_by_name" caption="Admitted By" />
        <Column
          dataField="discharged"
          caption="Status"
          allowFiltering={true}
          allowSearch={true}
          cellRender={statusRender}
        />
        <Column dataField="" caption="" cellRender={actionsFunc} />
      </DataGrid>
      {/* Add your modal component here for editing admission */}
      { editOpen && (
        <EditAdmission
          open={editOpen}
          setOpen={setEditOpen}
          selectedRowData={selectedRowData}
        />
      )}
      {/* Add your modal component here for dispatching patient */}
        {showDispatchModal && (
          <DispatchPatientModal
            dispatchOpen={showDispatchModal}
            setDispatchOpen={setShowDispatchModal}
            selectedRowData={selectedRowData}
          />
        )}
    </section>
  );
};

export default AdmitPatientDataGrid;
