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
  fetchTriageSettings,
} from "@/redux/service/patients";


const initialState = {
  processes: [],
  // How many visits matched on the server; more than processes.length when
  // only the most recent page was loaded.
  processesCount: 0,
  processDetails: {},
  services: [],
  patients: [],
  prescriptionItems: [],
  patientPrescribedDrugs: [],
  searchedPatients: [],
  profileDetails: {},
  patientTriage: {},
  triageSettings: null,
};

const PatientSlice = createSlice({
  name: "patients",
  initialState,
  reducers: {
    setProcesses: (state, action) => {
      state.processes = action.payload;
    },
    setProcessesCount: (state, action) => {
      state.processesCount = action.payload;
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
    setTriageSettings: (state, action) => {
      state.triageSettings = action.payload;
    },
    setPrescriptionItem: (state, action) => {
      state.prescriptionItems = action.payload

    },
    updateAttendaceProcessStoreRefer: (state, action) => {
      state.processes = state.processes.map((process) => {
        return (
          process.id === action.payload.attendance_process ? { ...process, referral: action.payload } : process
        )
      }
      );
    },
    updateAttendaceProcessStoreClinicalNotes: (state, action) => {
      state.processes = state.processes.map((process) => {

        return (
          process.id === action.payload.attendance_process ? { ...process, clinical_note: action.payload } : process
        )
      });
    },
    setPatientPrescriptionItem: (state, action) => {
      const prescriptionItem = state.prescriptionItems.find(item => item.item === action.payload.item);
      if (prescriptionItem) {
        // If prescriptionItem is found, update the existing item in the array
        state.prescriptionItems = state.prescriptionItems.map(item =>
          item.item === action.payload.item ? { ...item, dosage: action.payload.dosage, frequency: action.payload.frequency, duration: action.payload.duration, note: action.payload.note } : item
        );
      } else {
        // If prescriptionItem is not found, add the new item to the array
        state.prescriptionItems = [...state.prescriptionItems, action.payload];
      }
    },
    removePrescriptionItem: (state, action) => {
      const prescriptionItem = state.prescriptionItems.filter(item => item.item != action.payload.item);
      state.prescriptionItems = prescriptionItem;
    },
    clearPrescriptionItems: (state, action) => {
      state.prescriptionItems = [];
    },
  },
});

export const {
  setServices,
  setPatients,
  setProfile,
  setPatientTriage,
  setTriageSettings,
  setSearchedPatients,
  removePrescriptionItem,
  setPatientPrescriptionItem,
  clearPrescriptionItems,
  setPatientPrescribedDrugs,
  setProcesses,
  setProcessesCount,
  setOneProcess,
  setPrescriptionItem,
  updateAttendaceProcessStoreClinicalNotes,
  updateAttendaceProcessStoreRefer
} = PatientSlice.actions;

// The query the visible queue last loaded, so a modal that changes a visit can
// reload that same queue (refreshProcesses) instead of replacing it with an
// unfiltered list.
let lastProcessesQuery = { processsFilter: undefined, selectedSearchFilter: undefined };

/**
 * Load a queue of visits. processsFilter: { track, search, page_size }, where
 * track is one track or several comma-separated ("lab,pharmacy,doctor").
 * The backend returns the most recent page_size visits that match, plus how
 * many matched in all.
 */
export const getAllProcesses = (auth, process_id = null, processsFilter, selectedSearchFilter) => async (dispatch) => {
  lastProcessesQuery = { processsFilter, selectedSearchFilter };
  try {
    const response = await fetchAllAttendanceProcesses(auth, process_id, processsFilter, selectedSearchFilter);
    const results = Array.isArray(response) ? response : (response?.results ?? []);
    dispatch(setProcesses(results));
    dispatch(setProcessesCount(Array.isArray(response) ? response.length : (response?.count ?? results.length)));
  } catch (error) {
    console.log("ATTENDANCE_PROCESSES_ERROR ", error);
  }
};

/** Reload whatever queue is on screen, after a visit was changed. */
export const refreshProcesses = (auth) => (dispatch) =>
  dispatch(getAllProcesses(auth, null, lastProcessesQuery.processsFilter, lastProcessesQuery.selectedSearchFilter));

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
    console.log("PATIENT_ERROR ", error);
  }
};

export const getTriageSettings = (auth) => async (dispatch) => {
  try {
    const response = await fetchTriageSettings(auth);
    dispatch(setTriageSettings(response));
  } catch (error) {
    console.log("TRIAGE_SETTINGS_ERROR ", error);
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
