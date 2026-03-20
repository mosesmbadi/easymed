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
import { getAllPatients } from "@/redux/features/patients";
import { useSelector, useDispatch } from "react-redux";
import { MdAddCircle } from "react-icons/md";
import { LuMoreHorizontal } from "react-icons/lu";
import { BiEdit } from "react-icons/bi";
import { MdOutlineCalendarToday } from "react-icons/md";
import CreateAppointmentModal from "./create-appointment-modal";
import EditPatientDetails from "../admin-interface/edit-patient-details-modal";
import LabModal from "../doctor-desk/lab-modal";
import { useAuth } from "@/assets/hooks/use-auth";
import ShowInsurancesPopover from "./ShowInsurancesPopover";
import PAtientSearch from "./PatientSearch";
import BookAppointmentModal from "./BookAppointmentModal";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const allowedPageSizes = [5, 10, 'all'];

const PatientsDataGrid = () => {
  const { patients } = useSelector((store) => store.patient);
  const dispatch = useDispatch();
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedRowData, setSelectedRowData] = useState({});
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
  const [showNavButtons, setShowNavButtons] = useState(true);
  const [showInfo, setShowInfo] = useState(true);
  const [labOpen, setLabOpen] = useState(false);
  const [bookAppointmentOpen, setBookAppointmentOpen] = useState(false);
  const [selectedPatientForBooking, setSelectedPatientForBooking] = useState(null);
  const router = useRouter()
  const [processsFilter, setProcessFilter] = useState({ search: "" })
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})

  const onMenuClick = async (menu, data) => {
    if (menu.action === "add") {
      setSelectedRowData(data);
      setOpen(true);
    } else if (menu.action === "update") {
      setSelectedRowData(data);
      setEditOpen(true);
    } else if (menu.action === "prescribe") {
      router.push(`/dashboard/patients/prescribe/${data.id}`);
    } else if (menu.action === "send to lab") {
      setSelectedRowData(data);
      setLabOpen(true);
    } else if (menu.action === "book") {
      setSelectedPatientForBooking(data);
      setBookAppointmentOpen(true);
    }
  };

  // Custom actions cell with Material-UI Menu
  const ActionsCell = ({ data }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const handleAction = (action) => {
      handleClose();
      onMenuClick(action, data);
    };

    return (
      <>
        <IconButton onClick={handleClick}>
          <LuMoreHorizontal className="text-xl" />
        </IconButton>
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={() => handleAction({ action: "add" })}>
            <MdAddCircle className="text-success text-xl mx-2" /> New Visit
          </MenuItem>
          <MenuItem onClick={() => handleAction({ action: "book" })}>
            <MdOutlineCalendarToday className="text-success text-xl mx-2" /> Book Appointment
          </MenuItem>
          <MenuItem onClick={() => handleAction({ action: "update" })}>
            <BiEdit className="text-success text-xl mx-2" /> Update Patient
          </MenuItem>
        </Menu>
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
    const timerId = setTimeout(() => {
      dispatch(getAllPatients(auth, processsFilter, selectedSearchFilter))
    }, 500);
    return () => clearTimeout(timerId);
  }, [processsFilter.search]);

  return (
    <>
      <section className="mt-4">
        <div className="flex items-center gap-4 mb-4">
          <PAtientSearch
            setProcessFilter={setProcessFilter} 
            selectedFilter={processsFilter}
            selectedSearchFilter={selectedSearchFilter} 
            setSelectedSearchFilter={setSelectedSearchFilter}
          />
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
          <Column dataField="unique_id" caption="Patient ID" width={120} />
          <Column dataField="" caption="Patient Name" width={150} calculateCellValue={patientFullName} />
          <Column dataField="phone" caption="Phone" width={100} />
          <Column dataField="email" caption="Email" width={100} />
          <Column dataField="age" caption="Age" width={50} />
          <Column dataField="gender" caption="Gender" width={100} />
          <Column dataField="" caption="Insurance" cellRender={renderInsurances} width={180} />
          <Column dataField="" caption="" width={50} cellRender={(cellData) => <ActionsCell data={cellData.data} />} />
        </DataGrid>
      </section>
      {open && <CreateAppointmentModal {...{setOpen,open,selectedRowData}} />}
      <EditPatientDetails open={editOpen} setOpen={setEditOpen} selectedRowData={selectedRowData}  />
      {bookAppointmentOpen && (
        <BookAppointmentModal
          open={bookAppointmentOpen}
          setOpen={setBookAppointmentOpen}
          patient={selectedPatientForBooking}
        />
      )}
    </>
  );
};

export default PatientsDataGrid;