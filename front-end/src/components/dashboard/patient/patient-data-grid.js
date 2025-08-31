import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import {
  Column,
  Paging,
  Pager,
  HeaderFilter,
  Scrolling,
} from "devextreme-react/data-grid";
import { useRouter } from 'next/navigation'
import AddPatientModal from "./add-patient-modal";
import { Chip } from "@mui/material";
import { getAllPatients } from "@/redux/features/patients";
import { useSelector, useDispatch } from "react-redux";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { MdAddCircle } from "react-icons/md";
import { MdOutlineContactSupport } from "react-icons/md";
import { LuMoreHorizontal } from "react-icons/lu";
import { BiEdit } from "react-icons/bi";
import CreateAppointmentModal from "./create-appointment-modal";
import EditPatientDetails from "../admin-interface/edit-patient-details-modal";
import { GiMedicinePills } from "react-icons/gi";
import LabModal from "../doctor-interface/lab-modal";
import { useAuth } from "@/assets/hooks/use-auth";
import ShowInsurancesPopover from "./ShowInsurancesPopover";


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => {
  let actions = [
    {
      action: "add",
      label: "New Visit",
      icon: <MdAddCircle className="text-success text-xl mx-2" />,
    },
    {
      action: "update",
      label: "Update Patient",
      icon: <BiEdit className="text-success text-xl mx-2" />,
    },
  ];

  return actions;
};

const PatientsDataGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const { patients } = useSelector((store) => store.patient);
  const dispatch = useDispatch();
  const auth = useAuth()
  const userActions = getActions();
  const [open,setOpen] = useState(false)
  const [editOpen,setEditOpen] = useState(false)
  const [selectedRowData,setSelectedRowData] = useState({});
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [labOpen, setLabOpen] = useState(false);
  const router = useRouter()
  
  const onMenuClick = async (menu, data) => {
    if (menu.action === "add") {
      setSelectedRowData(data);
      setOpen(true);
    }else if(menu.action === "update"){
      setSelectedRowData(data);
      setEditOpen(true);      
    }else if (menu.action === "prescribe") {
      router.push(`/dashboard/patients/prescribe/${data.id}`);
    } else if(menu.action === "send to lab"){
      setSelectedRowData(data);
      setLabOpen(true);
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

  const patientFullName = (rowData) => {
    return rowData.first_name + " " + rowData.second_name;
  }

  const renderInsurances = ({ data }) => {
    if (data.insurances.length > 0) {
      return <ShowInsurancesPopover data={data}/>
    } else {
      return 'NA';
    }
  };

  useEffect(() => {
    dispatch(getAllPatients(auth));
  }, []);

  return (
    <>
    <section className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <AddPatientModal />
      </div>
      <DataGrid
        dataSource={patients}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={false}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={false}
        className="shadow-xl w-full"
        // height={"60vh"}
      >
        <HeaderFilter visible={true} />
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        <Paging defaultPageSize={10} />
        <Pager
          visible={true}
          showInfo={showInfo}
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector={showPageSizeSelector}
          showNavigationButtons={showNavButtons}
        />
        <Column 
          dataField="unique_id" 
          caption="id" 
          width={100}
        />
        <Column 
          dataField="" 
          caption="Patient Name" 
          width={150}
          calculateCellValue={patientFullName}
        />
        <Column
          dataField="phone"
          caption="Phone"
          width={100}
        />
        <Column
          dataField="email"
          caption="Email"
          width={100}
        />
        <Column
          dataField="age"
          caption="Age"
          width={50}
        />
        <Column dataField="gender" caption="Gender" width={100} />
        <Column 
          dataField="" 
          caption="Insurance"
          cellRender={renderInsurances}
          width={180} 
        />
        <Column
          dataField=""
          caption=""
          width={50}
          cellRender={actionsFunc}
        />
      </DataGrid>
    </section>
    {open && <CreateAppointmentModal {...{setOpen,open,selectedRowData}} />}
    <EditPatientDetails open={editOpen} setOpen={setEditOpen} selectedRowData={selectedRowData}  />
    </>
  );
};

export default PatientsDataGrid;
