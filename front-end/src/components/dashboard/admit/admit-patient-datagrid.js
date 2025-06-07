import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Column, Paging, Pager, HeaderFilter, Scrolling } from "devextreme-react/data-grid";
import { useDispatch, useSelector } from "react-redux";
import { getAllInpatients } from "@/redux/features/inpatient";
import { useAuth } from "@/assets/hooks/use-auth";
import { useRouter } from "next/router";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import { BiTransferAlt, BiSupport } from "react-icons/bi";
import { FaBed } from "react-icons/fa";
import { MdOutlineContactSupport } from "react-icons/md";
import { GiMedicinePills } from "react-icons/gi";

// Modals
import ReferPatientModal from "../patient/refer-patient-modal";
import ConsultPatientModal from "../doctor-interface/consult-modal";
import PrescribePatientModal from "../doctor-interface/prescribe-patient-modal";
import LabModal from "../doctor-interface/lab-modal";
import ApproveResults from "../laboratory/add-result/ApproveResults";

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), { ssr: false });

const allowedPageSizes = [5, 10, 'all'];

const getActions = () => [
  { action: "refer", label: "Refer Patient", icon: <BiTransferAlt className="text-card text-xl mx-2" /> },
  { action: "consult", label: "Consult", icon: <BiSupport className="text-card text-xl mx-2" /> },
  { action: "prescribe", label: "Prescribe", icon: <GiMedicinePills className="text-card text-xl mx-2" /> },
  { action: "send to lab", label: "Send To Lab", icon: <MdOutlineContactSupport className="text-card text-xl mx-2" /> },
  { action: "results", label: "View Results", icon: <MdOutlineContactSupport className="text-card text-xl mx-2" /> },
];

const AdmitPatientDataGrid = () => {
  const dispatch = useDispatch();
  const auth = useAuth();
  const router = useRouter();

  const { inpatients } = useSelector((state) => state.inpatient);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [selectedRowData, setSelectedRowData] = useState({});
  const [open, setOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [prescribeOpen, setPrescribeOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (auth?.token) {
      dispatch(getAllInpatients(auth));
    }
  }, [auth]);

  if (!mounted) return null;

  const filteredInpatients = inpatients?.filter((inpatient) =>
    `${inpatient?.patient_first_name ?? ""} ${inpatient?.patient_second_name ?? ""}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  ) || [];

  const patientNameRender = (cellData) => {
    const { patient_first_name, patient_second_name } = cellData.data;
    return `${patient_first_name} ${patient_second_name}`;
  };

  const onMenuClick = (menu, data) => {
    setSelectedRowData(data);
    switch (menu.action) {
      case "refer":
        setOpen(true);
        break;
      case "consult":
        setConsultOpen(true);
        break;
      case "prescribe":
        router.push(`/dashboard/doctor-interface/${data.id}/${data.prescription}`);
        break;
      case "send to lab":
        setLabOpen(true);
        break;
      case "results":
        setResultOpen(true);
        break;
      default:
        break;
    }
  };

  const actionsFunc = ({ data }) => (
    <CmtDropdownMenu
      items={getActions()}
      onItemClick={(menu) => onMenuClick(menu, data)}
      TriggerComponent={<LuMoreHorizontal className="cursor-pointer text-xl" />}
    />
  );

  return (
    <section>
      <DataGrid
        dataSource={filteredInpatients}
        allowColumnReordering
        rowAlternationEnabled
        onSelectionChanged={({ selectedRowKeys }) => setSelectedRecords(selectedRowKeys)}
        selectedRowKeys={selectedRecords}
        showBorders
        remoteOperations={false}
        showColumnLines
        showRowLines
        wordWrapEnabled
        allowPaging
        className="shadow-xl w-full"
      >
        <HeaderFilter visible />
        <Scrolling rowRenderingMode="virtual" />
        <Paging defaultPageSize={10} />
        <Pager
          visible
          allowedPageSizes={allowedPageSizes}
          showPageSizeSelector
          showInfo
          showNavigationButtons
        />
        <Column dataField="admission_id" caption="PId" />
        <Column dataField="patient_first_name" caption="Patient Name" cellRender={patientNameRender} />
        <Column dataField="reason_for_admission" caption="Reason" width={200} />
        <Column dataField="" caption="Action" cellRender={actionsFunc} />
      </DataGrid>

      {/* Modals */}
      {open && <ReferPatientModal {...{ open, setOpen, selectedRowData }} />}
      {consultOpen && <ConsultPatientModal {...{ consultOpen, setConsultOpen, selectedRowData }} />}
      {prescribeOpen && <PrescribePatientModal {...{ prescribeOpen, setPrescribeOpen, selectedRowData }} />}
      {labOpen && <LabModal {...{ labOpen, setLabOpen, selectedRowData }} />}
      {resultOpen && <ApproveResults selectedData={selectedRowData} approveOpen={resultOpen} setApproveOpen={setResultOpen} />}
    </section>
  );
};

export default AdmitPatientDataGrid;
