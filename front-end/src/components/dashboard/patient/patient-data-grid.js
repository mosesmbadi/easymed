import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { Column, Paging, Scrolling } from "devextreme-react/data-grid";
import ServerPager from "@/components/common/ServerPager";
import { useServerList } from "@/assets/hooks/use-server-list";
import { fetchPatientsPage } from "@/redux/service/patients";
import { useRouter } from 'next/navigation'
import AddPatientModal from "./add-patient-modal";
import { Chip } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { MdAddCircle } from "react-icons/md";
import { MdOutlineContactSupport } from "react-icons/md";
import { LuMoreHorizontal } from "react-icons/lu";
import { BiEdit } from "react-icons/bi";
import CreateAppointmentModal from "./create-appointment-modal";
import EditPatientDetails from "../admin-interface/edit-patient-details-modal";
import { GiMedicinePills, GiMicroscope } from "react-icons/gi";
import LabModal from "../doctor-desk/lab-modal";
import { useAuth } from "@/assets/hooks/use-auth";
import ShowInsurancesPopover from "./ShowInsurancesPopover";
import PAtientSearch from "./PatientSearch";
import { useFacility } from "@/assets/hooks/use-facility";


const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});


// A New Visit goes to check-in, which a standalone lab doesn't have; there the
// patient's tests are ordered on the lab's walk-in screen instead.
const getActions = ({ canCheckIn, canOrderLab }) => {
  let actions = [
    canCheckIn && {
      action: "add",
      label: "New Visit",
      icon: <MdAddCircle className="text-success text-xl mx-2" />,
    },
    canOrderLab && {
      action: "lab request",
      label: "Request Lab Tests",
      icon: <GiMicroscope className="text-success text-xl mx-2" />,
    },
    {
      action: "update",
      label: "Update Patient",
      icon: <BiEdit className="text-success text-xl mx-2" />,
    },
  ];

  return actions.filter(Boolean);
};

const PatientsDataGrid = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const { patientListVersion } = useSelector((store) => store.patient);
  const dispatch = useDispatch();
  const auth = useAuth()
  const { isModuleEnabled } = useFacility();
  const { userPermissions } = useSelector((store) => store.auth);
  const userActions = getActions({
    canCheckIn: isModuleEnabled("reception"),
    // The walk-in screen is gated on the lab dashboard.
    canOrderLab: Array.isArray(userPermissions) && userPermissions.includes("CAN_ACCESS_LABORATORY_DASHBOARD"),
  });
  const [open,setOpen] = useState(false)
  const [editOpen,setEditOpen] = useState(false)
  const [selectedRowData,setSelectedRowData] = useState({});
  const [labOpen, setLabOpen] = useState(false);
  const router = useRouter()
  const [processsFilter, setProcessFilter] = useState({ search: "" })
  const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})
  
  const onMenuClick = async (menu, data) => {
    if (menu.action === "add") {
      setSelectedRowData(data);
      setOpen(true);
    }else if(menu.action === "update"){
      setSelectedRowData(data);
      setEditOpen(true);      
    }else if (menu.action === "prescribe") {
      router.push(`/dashboard/patients/prescribe/${data.id}`);
    } else if (menu.action === "lab request") {
      router.push(`/dashboard/laboratory/walk-in?patient=${data.id}`);
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
    return rowData.display_name || `${rowData.first_name} ${rowData.second_name}`;
  }

  // Patients we only know through samples another facility sent are that
  // facility's patients, not ours: kept off the list unless asked for, or
  // searched for by name or by the facility's number. Filtered, searched and
  // paged on the server.
  const [showReferred, setShowReferred] = useState(false);
  const [referredCount, setReferredCount] = useState(0);
  const patientsPage = useServerList(fetchPatientsPage, {
    search_value: processsFilter.search,
    search_field: selectedSearchFilter.value,
    referred: showReferred || processsFilter.search ? undefined : "false",
  }, { reloadOn: patientListVersion });

  useEffect(() => {
    if (!auth) return;
    fetchPatientsPage(auth, { referred: "true", page: 1, page_size: 1 })
      .then((data) => setReferredCount(data.count))
      .catch(() => setReferredCount(0));
  }, [auth, patientListVersion]);

  const renderInsurances = ({ data }) => {
    if (data.insurances.length > 0) {
      return <ShowInsurancesPopover data={data}/>
    } else {
      return 'NA';
    }
  };

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
        {referredCount > 0 && (
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={showReferred}
              onChange={(e) => setShowReferred(e.target.checked)}
            />
            Show patients from referred samples ({referredCount})
          </label>
        )}
      </div>
      <DataGrid
        dataSource={patientsPage.rows}
        noDataText={patientsPage.loading ? "Loading..." : patientsPage.error || "No patients"}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        showColumnLines={false}
        showRowLines={true}
        wordWrapEnabled={true}
        className="shadow-xl w-full"
      >
        <Scrolling rowRenderingMode='virtual'></Scrolling>
        {/* The server sends one page; ServerPager below asks for others. */}
        <Paging enabled={false} />
        <Column 
          dataField="unique_id" 
          caption="Patient ID" 
          width={120}
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
      <ServerPager
        page={patientsPage.page}
        pageSize={patientsPage.pageSize}
        total={patientsPage.total}
        loading={patientsPage.loading}
        onPageChange={patientsPage.setPage}
        onPageSizeChange={patientsPage.setPageSize}
      />
    </section>
    {open && <CreateAppointmentModal {...{setOpen,open,selectedRowData}} />}
    <EditPatientDetails open={editOpen} setOpen={setEditOpen} selectedRowData={selectedRowData}  />
    </>
  );
};

export default PatientsDataGrid;
