import React, { useState, useEffect } from 'react'
import dynamic from "next/dynamic";
import { useSelector, useDispatch } from 'react-redux';
import { Dialog, DialogContent, DialogTitle, Grid } from '@mui/material'
import { Column, Paging, Pager,
    HeaderFilter, Scrolling,
   } from "devextreme-react/data-grid";
import CmtDropdownMenu from "@/assets/DropdownMenu";
import { LuMoreHorizontal } from "react-icons/lu";
import AssignDoctorModal from '../reception-interface/assign-doctor-modal';

import { LiaUserNurseSolid } from "react-icons/lia";
import { BsCapsule } from "react-icons/bs";
import { GiMicroscope } from "react-icons/gi";
import DirectToTheLabModal from '../doctor-interface/DirectToTheLabModal';
import { updateAttendanceProcesses } from '@/redux/service/patients';
import { getAllProcesses } from '@/redux/features/patients';
import { useAuth } from '@/assets/hooks/use-auth';
import ProcessFilter from '@/components/common/process/ProcessFilter';

const allowedPageSizes = [5, 10, 'all'];

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
    ssr: false,
  });

  const getActions = () => {
    let actions = [
      {
        action: "consult",
        label: "Send to Doctor",
        icon: <LiaUserNurseSolid className="text-card text-xl mx-2" />,
      },
      {
        action: "prescribe",
        label: "Prescribe",
        icon: <BsCapsule className="text-card text-xl mx-2" />,
      },
      {
        action: "send to lab",
        label: "Send To Lab",
        icon: <GiMicroscope className="text-card text-xl mx-2" />,
      },
    ];
  
    return actions;
  };


const AppointmentCard = () => {

    const [processsFilter, setProcessFilter]=useState({ track: 'reception', search: "" })
    const [assignOpen, setAssignOpen]=useState(false)
    const userActions = getActions();
    const [showPageSizeSelector, setShowPageSizeSelector] = useState(true);
    const [showInfo, setShowInfo] = useState(true);
    const [showNavButtons, setShowNavButtons] = useState(true);
    const [labOpen, setLabOpen] = useState(false);
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const dispatch = useDispatch()
    const auth = useAuth()
    const { processes } = useSelector((store)=>store.patient);
    const [selectedData, setSelectedData] = useState({})
    const {patients} =  useSelector((store)=> store.patient)
    const [searchQuery, setSearchQuery] = useState("")
    // const [date, setDate] = useState("2025-09-12")
    const [selectedSearchFilter, setSelectedSearchFilter] = useState({label: "", value: ""})

    const items = [
        {label: "None", value: ""},
        {label: "Patient First Name", value: "patient__first_name"},
        {label: "Patient Second Name", value: "patient__second_name"},
        {label: "Patient Id", value: "patient_number"},
        // {label: "Track Number", value: "track_number"},
        // {label: "Doctor First Name", value: "doctor__first_name"},
        // {label: "Doctor Last Name", value: "doctor__last_name"},
        // {label: "Lab Tech First Name", value: "lab_tech__first_name"},
        // {label: "Lab Tech Last Name", value: "lab_tech__last_name"},
        // {label: "Pharmacist First Name", value: "pharmacist__first_name"},
        // {label: "Pharmacist Last Name", value: "pharmacist__last_name"},
        {label: "Reason", value: "reason"},
        // {label: "Diagnosis", value: "clinical_note__diagnosis"},
        // {label: "Doctors Notes", value: "clinical_note__doctors_note"},
        // {label: "Signs And Symptoms", value: "clinical_note__signs_and_symptoms"},
        // {label: "Test Profile Name", value: "process_test_req__attendace_test_requests__test_profile__name"},
        // {label: "Prescribed Drug Name", value: "prescription__attendance_prescribed_drugs__item__name"},
    ]

    const handleClose = () => {
        setOpen(false);
    };

    const sendToLab = (patient, process) => {
        const selectedData = {
            ...process,
            patient_name: patient.first_name + " " + patient.second_name
        }
        setSelectedData(selectedData)
        setLabOpen(true)
    }

    const sendToPharmacy = (patient, process) => {
        const selectedData = {
            ...process,
            patient_name: patient.first_name + " " + patient.second_name
        }
        setSelectedData(selectedData)
        setOpen(true)
    }

    const sendForTriage = (patient, process) => {
        const selectedData = {
            ...process,
            patient_name: patient.first_name + " " + patient.second_name
        }
        console.log(selectedData)
        setSelectedData(selectedData)
        setAssignOpen(true)
    }


    const patientNameRender = (cellData) => {
        const patient = patients.find((patient) => patient.id === cellData.data.patient);
        return patient ? `${patient.first_name} ${patient.second_name}` : ""
    }

    const onMenuClick = async (menu, data) => {
        const linkedPatient = patients.find((patient)=> patient.id === data.patient)
        if (menu.action === "consult") {
            sendForTriage(linkedPatient, data)
        } else if (menu.action === "prescribe") {
            sendToPharmacy(linkedPatient, data)
        } else if(menu.action === "send to lab"){
            sendToLab(linkedPatient, data)
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

    const handleSendToPharmacy = async () => {
        try {
            const response = await updateAttendanceProcesses({track: "pharmacy"}, selectedData.id, auth)
            console.log(response)
            dispatch(getAllProcesses(auth))
            handleClose()

        }catch(error){
            console.log("Err sending to pharmacy", error)
        }
    }

    const receptionProcesses = processes.filter((process)=> process.track.includes(processsFilter.track))

    useEffect(() => {
        // This effect handles the debouncing logic
        const timerId = setTimeout(() => {
            // Dispatch the action only after a 500ms delay
            dispatch(getAllProcesses(auth, null, processsFilter, selectedSearchFilter))
        }, 500); // 500ms delay, adjust as needed

        // Cleanup function: clears the timer if searchTerm changes before the delay is over
        return () => {
            clearTimeout(timerId);
        };
    }, [processsFilter.search]); // The effect re-runs only when the local `searchTerm` state changes

  return (
    <>
    <ProcessFilter 
        setProcessFilter={setProcessFilter} 
        selectedFilter={processsFilter}
        selectedSearchFilter={selectedSearchFilter} 
        setSelectedSearchFilter={setSelectedSearchFilter}
        items={items}
    />
    <DataGrid
        dataSource={receptionProcesses}
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
          caption="PID"
          allowSearch={true}
        />
        <Column
          dataField="patient"
          caption="Patient Name"
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
        {assignOpen && (<AssignDoctorModal {...{ assignOpen, setAssignOpen, selectedData }} />)}
        {labOpen && (<DirectToTheLabModal
            {...{ labOpen, setLabOpen, selectedData }}
        />)}
        <Dialog
            open={open}
            onClose={handleClose}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle>
            <p className="text-sm font-semibold">{`send ${selectedData?.patient_name} for Prescription?`}</p>
            </DialogTitle>
            <DialogContent>
                <section className="space-y-1">
                    <h2 className='w-full text-xl'>Are you sure you want to send the patient for prescription ? </h2>
                    <Grid container spacing={2}>
                        <Grid item md={12} xs={12}>
                            <div className="flex items-center gap-2 justify-end mt-3">
                                <p
                                    className="border border-warning text-sm rounded-xl px-3 py-2 cursor-pointer"
                                    onClick={handleClose}
                                >
                                Cancel
                                </p>
                                <button
                                onClick={handleSendToPharmacy}
                                className="bg-primary px-3 py-2 text-sm text-white rounded-xl"
                                >
                                {loading && (
                                    <svg
                                    aria-hidden="true"
                                    role="status"
                                    class="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                                    viewBox="0 0 100 101"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    >
                                    <path
                                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                                        fill="currentColor"
                                    ></path>
                                    <path
                                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                                        fill="#1C64F2"
                                    ></path>
                                    </svg>
                                )}
                                send for prescription
                                </button>
                            </div>
                        </Grid>

                    </Grid>
                </section>
            </DialogContent>
        </Dialog>
    </>

  )
}

export default AppointmentCard