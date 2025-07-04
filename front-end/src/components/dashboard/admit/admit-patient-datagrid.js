import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdmitted } from "@/redux/features/inpatient";
import { useAuth } from "@/assets/hooks/use-auth";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { BiEdit } from "react-icons/bi";
import EditAdmission from "./modals/UpdateAdmissionModal";

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
  ];

  return actions;
};

const AdmitPatientDataGrid = ({ward_id=""}) => {
  const showPageSizeSelector = true;
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState({});
  const showInfo = true;
  const { patients } = useSelector((store) => store.inpatient);
  const dispatch = useDispatch();
  const auth = useAuth();
  const userActions = getActions();

  const onMenuClick = async (menu, data) => {
    if(menu.action === "update"){
      setSelectedRowData(data);
      setEditOpen(true);      
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

  // dummy functions and values for now
  const onSelectionChanged = () => {};
  const selectedRecords = [];

  const patientNameRender = (cellData) => {
    return `${cellData.data.patient_first_name} ${cellData.data.patient_second_name}`
  }

  useEffect(() => {
    if(auth.token){
      dispatch(fetchAdmitted(auth, ward_id));
    }
  }, [auth])

  return (
    <section>
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
        <Column
          dataField="patient_age"
          caption="Patient Age"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column
          dataField="patient_gender"
          caption="Patient Gender"
          allowFiltering={true}
          allowSearch={true}
        />
        <Column dataField="reason_for_admission" caption="Reason" />
        <Column dataField="ward" caption="Ward" />
        <Column dataField="bed" caption="Bed" />
        <Column dataField="admitted_by_name" caption="Admitted By" />
        <Column dataField="actions" caption="Action" cellRender={actionsFunc} />
      </DataGrid>
      {/* Add your modal component here for editing admission */}
      <EditAdmission
        open={editOpen}
        setOpen={setEditOpen}
        selectedRowData={selectedRowData}/>
    </section>
  );
};

export default AdmitPatientDataGrid;
