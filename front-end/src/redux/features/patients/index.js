import { createSlice } from "@reduxjs/toolkit";
import { fetchPrescriptionsPrescribedDrugs } from "@/redux/service/pharmacy";
import { 
  fetchServices,
  fetchPatient, 
  fetchPatientProfile, 
  fetchPatientTriage, 
  searchPatients, 
  fetchPatientPrescribeDrugs, 
  fetchAllAttendanceProcesses,
} from "@/redux/service/patients";


const initialState = {
  processes: [],
  processDetails: {},
  services: [],
  patients: [],
  prescriptionItems: [],
  patientPrescribedDrugs: [],
  searchedPatients: [],
  profileDetails: {},
  patientTriage: {},
};

const PatientSlice = createSlice({
  name: "patients",
  initialState,
  reducers: {
    setProcesses: (state, action) => {
      state.processes = action.payload;
    },
    setOneProcess: (state, action) => {
      state.processDetails = action.payload;
    },
    setServices: (state, action) => {
      state.services = action.payload;
    },
    setPatients: (state, action) => {
      state.patients = action.payload;
    },
    setSearchedPatients: (state, action) => {
      state.searchedPatients = action.payload;
    },
    setProfile: (state, action) => {
      state.profileDetails = action.payload;
    },
    setPatientPrescribedDrugs: (state, action) => {
      state.patientPrescribedDrugs = action.payload
    },
    setPatientTriage: (state, action) => {
      state.patientTriage = action.payload;
    },
    setPrescriptionItem: (state, action) => {
      state.prescriptionItems = action.payload

    },
    updateAttendaceProcessStoreRefer: (state, action) => {
      state.processes = state.processes.map((process) => {
        return (
          process.id === action.payload.attendance_process ? { ...process, referral: action.payload } : process
        )}
      );
    },
    updateAttendaceProcessStoreClinicalNotes: (state, action) => {
      state.processes = state.processes.map((process) => {
      
        return (
           process.id === action.payload.attendance_process ? { ...process, clinical_note: action.payload } : process
      )});
    },
    setPatientPrescriptionItem: (state, action) => {
      const prescriptionItem = state.prescriptionItems.find(item => item.item === action.payload.item );
      if (prescriptionItem) {
        // If prescriptionItem is found, update the existing item in the array
        state.prescriptionItems = state.prescriptionItems.map(item =>
          item.item === action.payload.item ? { ...item, dosage:action.payload.dosage, frequency:action.payload.frequency, duration:action.payload.duration, note:action.payload.note } : item
        );
      } else {
        // If prescriptionItem is not found, add the new item to the array
        state.prescriptionItems = [...state.prescriptionItems, action.payload];
      }
    },
    removePrescriptionItem: (state, action) => {
      const prescriptionItem = state.prescriptionItems.filter(item => item.item != action.payload.item );
      state.prescriptionItems = prescriptionItem;
    },
    clearPrescriptionItems: (state, action)=>{
      state.prescriptionItems = [];
    },
    addAdmissionToAttendance: (state, action) => {
      const newAdmission = action.payload;
      state.processes = state.processes.map((process) =>
        process.id === newAdmission.attendance_process ? {...process, AttendanceProcess: newAdmission} : process
      );
    }
  },
});

export const { 
  setServices,
  setPatients,
  setProfile,
  setPatientTriage,
  setSearchedPatients,
  removePrescriptionItem,
  setPatientPrescriptionItem,
  clearPrescriptionItems,
  setPatientPrescribedDrugs,
  setProcesses,
  setOneProcess,
  setPrescriptionItem,
  updateAttendaceProcessStoreClinicalNotes,
  updateAttendaceProcessStoreRefer,
  addAdmissionToAttendance

} = PatientSlice.actions;

export const getAllProcesses = (auth, process_id=null,  processsFilter, selectedSearchFilter) => async (dispatch) => {
  try {
    console.log("REDUX ACTION: Calling fetchAllAttendanceProcesses with:", { auth, process_id, processsFilter, selectedSearchFilter });
    const response = await fetchAllAttendanceProcesses(auth, process_id, processsFilter, selectedSearchFilter);
    console.log("REDUX ACTION: fetchAllAttendanceProcesses response:", response);
    dispatch(setProcesses(response));
  } catch (error) {
    console.log("ATTENDANCE_PROCESSES_ERROR ", error);
  }
};

export const updateAttendanceWithAdmission = (response) => async (dispatch) => {
  dispatch(addAdmissionToAttendance(response))  
}

export const updateAttendanceProcessStoreClinicalNotesData = (payload) => (dispatch) => {
  dispatch(updateAttendaceProcessStoreClinicalNotes(payload));
};

export const updateAttendanceProcessStoreReferData = (payload) => (dispatch) => {
  dispatch(updateAttendaceProcessStoreRefer(payload));
};

export const getOneProcess = (auth, process_id) => async (dispatch) => {
  try {
    const response = await fetchAllAttendanceProcesses(auth, process_id);
    dispatch(setOneProcess(response));
  } catch (error) {
    console.log("ATTENDANCE_PROCESS_ERROR ", error);
  }
};


export const getAllServices = () => async (dispatch) => {
  try {
    const response = await fetchServices();
    dispatch(setServices(response));
  } catch (error) {
    console.log("SERVICES_ERROR ", error);
  }
};

export const getAllPatients = (auth, processsFilter, selectedSearchFilter) => async (dispatch) => {
  try {
    const response = await fetchPatient(auth, processsFilter, selectedSearchFilter);
    dispatch(setPatients(response));
  } catch (error) {
    console.log("PATIENTS_ERROR ", error);
  }
};

export const getAllSearchedPatients = (first_name) => async (dispatch) => {
  try {
    const response = await searchPatients(first_name);
    dispatch(setSearchedPatients(response));
  } catch (error) {
    console.log("PATIENTS_ERROR ", error);
  }
};

export const getPatientProfile = (auth, userId) => async (dispatch) => {
  try {
    const response = await fetchPatientProfile(auth, userId);
    dispatch(setProfile(response));
  } catch (error) {
    console.log("PROFILE_ERROR ", error);
  }
};

export const getPatientTriage = (id, auth) => async (dispatch) => {
  try {
    const response = await fetchPatientTriage(id, auth);
    dispatch(setPatientTriage(response));
  } catch (error) {
    console.log("PROFILE_ERROR ", error);
  }
};

export const getAllPatientPrescribedDrugs = (patient_id) => async (dispatch) => {
  try {
    const response = await fetchPatientPrescribeDrugs(patient_id);
    dispatch(setPatientPrescribedDrugs(response));
  } catch (error) {
    console.log("PATIENT_PRESCRIBED_DRUGS_ERROR ", error);
  }
};

export const getAllPrescribedDrugsByPrescription = (prescription_id, auth) => async (dispatch) => {
  try {
    const response = await fetchPrescriptionsPrescribedDrugs(prescription_id, auth);
    dispatch(setPrescriptionItem(response));
  } catch (error) {
    console.log("PRESCRIPTIONS_PRESCRIBED_DRUGS_ERROR ", error);
  }
};

export const addPrescriptionItem = (payload) => (dispatch) => {
  dispatch(setPatientPrescriptionItem(payload));
};

export const removeAPrescriptionItem = (payload) => (dispatch) => {
  dispatch(removePrescriptionItem(payload));
};

export const clearAllPrescriptionItems = () => (dispatch) => {
  dispatch(clearPrescriptionItems());
};

export default PatientSlice.reducer;
