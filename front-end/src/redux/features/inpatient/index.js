import { AddAdmittedPatientsVitals, fetchAdmittedPatients, fetchAdmittedPatientsVitals, fetchFacilityBeds, fetchFacilityWards, fetchNursesDuties, fetchAdmittedPatientSchedules, updateSheduledDrug, createScheduledDrug, createScheduledLabTest } from "@/redux/service/inpatient";
import { fetchPatientTriage } from "@/redux/service/patients";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  beds: [],
  wards: [],
  patients: [],
  assignedNurses: [],
  oneAdmission: {},
  vitals: [],
  schedules: [],
};

const InpatientSlice = createSlice({
  name: "inpatient",
  initialState,
  reducers: {
    fetchBeds: (state, action) => {
      state.beds = action.payload;
    },
    fetchWards: (state, action) => {
      state.wards = action.payload;
    },
    addBedToStore: (state, action) => {
      state.beds = [action.payload, ...state.beds];
    },
    updateBedInStore: (state, action) => {
      const updatedBed = action.payload;
      state.beds = state.beds.map((bed) =>
        bed.id === updatedBed.id ? updatedBed : bed
      );
    },
    addWardToStore: (state, action) => {
      state.wards = [action.payload, ...state.wards];
    },
    updateWardInStore: (state, action) => {
      const updatedWard = action.payload;
      state.wards = state.wards.map((ward) =>
        ward.id === updatedWard.id ? updatedWard : ward
      );
    },
    admittedPatients: (state, action) => {
      state.patients = action.payload;
    },
    oneAdmission: (state, action) => {
      state.oneAdmission = action.payload;
    },
    setVitals: (state, action) => {
      state.vitals = action.payload;
    },
    setNewVital: (state, action) => {
      state.vitals = [action.payload, ...state.vitals];
    },
    setSchedules: (state, action) => {
      state.schedules = action.payload;
    },
    appendScheduledDrug: (state, action) => {
      if (!state.schedules || state.schedules.length === 0) {
        state.schedules = [
          {
            scheduled_drugs: [action.payload],
            scheduled_lab_tests: [],
          },
        ];
        return;
      }

      if (!state.schedules[0].scheduled_drugs) {
        state.schedules[0].scheduled_drugs = [];
      }

      state.schedules[0].scheduled_drugs.push(action.payload);
    },
    appendScheduledLabTest: (state, action) => {
      if (!state.schedules || state.schedules.length === 0) {
        state.schedules = [
          {
            scheduled_drugs: [],
            scheduled_lab_tests: [action.payload],
          },
        ];
        return;
      }

      if (!state.schedules[0].scheduled_lab_tests) {
        state.schedules[0].scheduled_lab_tests = [];
      }

      state.schedules[0].scheduled_lab_tests.push(action.payload);
    },
    setUpdatedScheduledDrug: (state, action) => {
      const updatedScheduledDrug = action.payload;

      if (!state.schedules || state.schedules.length === 0) {
        return;
      }

      state.schedules[0].scheduled_drugs = (state.schedules[0].scheduled_drugs ?? []).map((sched) => {
        return sched.id === updatedScheduledDrug.id ? updatedScheduledDrug : sched;
      });
    },
    updateAdmissionInStore: (state, action) => {
      const updatedAdmission = action.payload;
      state.patients = state.patients.map((patient) =>
        patient.id === updatedAdmission.id ? updatedAdmission : patient
      );
    },
    updateAdmissionStoreDischargeData: (state, action) => {
      const updatedAdmission = action.payload;
      state.patients = state.patients.map((patient) =>
        parseInt(patient.attendance_process) === parseInt(updatedAdmission.attendance_process) ? {...patient, ward: null, bed: null, discharged: updatedAdmission.discharge_types} : patient
      );
    },
    assignedNurses: (state, action) => {
      state.assignedNurses = action.payload;
    }
  },
});

export const { 
  fetchBeds, fetchWards, 
  addBedToStore, addWardToStore,
  updateWardInStore, updateBedInStore, 
  admittedPatients, updateAdmissionInStore, updateAdmissionStoreDischargeData,
  assignedNurses, oneAdmission, setVitals, setNewVital, setSchedules, setUpdatedScheduledDrug,
  appendScheduledDrug, appendScheduledLabTest
 } = InpatientSlice.actions;

export const fetchHospitalBeds = (auth, ward_id) => async (dispatch) => {
  try {
    const response = await fetchFacilityBeds(auth, ward_id);
    dispatch(fetchBeds(response));
  } catch (error) {
    console.log("BEDS_ERROR ", error);
  }
};


export const fetchHospitalWards = (auth) => async (dispatch) => {
  try {
    const response = await fetchFacilityWards(auth);
    dispatch(fetchWards(response));
  } catch (error) {
    console.log("BEDS_ERROR ", error);
  }
};

export const fetchAdmitted = (auth, ward, admission_id='', processFilter={}, selectedSearchFilter={}) => async (dispatch) => {
  try {
    const response = await fetchAdmittedPatients(auth, ward, admission_id, processFilter, selectedSearchFilter);
    dispatch(admittedPatients(response));
  } catch (error) {
    console.log("ADMITTED_PATIENTS_ERROR ", error);
  }
};
export const updateAdmissionStoreDischarge = (response) => async (dispatch) => {
  dispatch(updateAdmissionStoreDischargeData(response))  
}


export const fetchOneAdmission = (auth, ward, admission_id) => async (dispatch) => {
  try {
    const response = await fetchAdmittedPatients(auth, ward, admission_id);
    dispatch(oneAdmission(response));
  } catch (error) {
    console.log("ONE_ADMISSION_ERROR ", error);
  }
};

export const fetchAdmissionVitals = (auth, admission_id, triage_id) => async (dispatch) => {
  try {
    const response = await fetchAdmittedPatientsVitals(auth, admission_id);
    const outpatientTriage = await fetchPatientTriage(triage_id, auth);
    dispatch(setVitals([outpatientTriage, ...response]));
  } catch (error) {
    console.log("ADMISSION VITALS ERROR ", error);
  }
};

export const AddAdmissionVitals = (auth, payload, admission_id) => async (dispatch) => {
  try {
    const response = await AddAdmittedPatientsVitals(auth, payload, admission_id);
    dispatch(setNewVital(response));
  } catch (error) {
    console.log("ADD ADMISSION VITALS ", error);
  }
};

export const fetchAssignedNursesDuties = (auth, ward_id) => async (dispatch) => {
  try {
    const response = await fetchNursesDuties(auth, ward_id);
    dispatch(assignedNurses(response));
  } catch (error) {
    console.log("NURSE_ASSIGNMENT_ERROR ", error);
  }
};

export const updateBedStoreAfterPost = (response) => async (dispatch) => {
  dispatch(addBedToStore(response))  
}

export const updateWardStoreAfterPost = (response) => async (dispatch) => {
  dispatch(addWardToStore(response))  
}

export const updateBedStoreAfterPatch = (response) => async (dispatch) => {
  dispatch(updateBedInStore(response))  
}

export const updateWardStoreAfterPatch = (response) => async (dispatch) => {
  dispatch(updateWardInStore(response))  
}

export const updateAdmissionStoreAfterPatch = (response) => async (dispatch) => {
  dispatch(updateAdmissionInStore(response))  
}

export const admittedPatientSchedules = (auth, admission_id) => async (dispatch) => {
  try {
    const response = await fetchAdmittedPatientSchedules(auth, admission_id);
    dispatch(setSchedules(response));
  } catch (error) {
    console.log("SCHEDULES ", error);
  }
};

export const updateInpatientScheduledDrug = (auth, admission_id, scheduled_drug_id, payload) => async (dispatch) => {
  try {
    const response = await updateSheduledDrug(auth, admission_id, scheduled_drug_id, payload);
    dispatch(setUpdatedScheduledDrug(response));
  } catch (error) {
    console.log("SCHEDULES ", error);
  }
};

export const addScheduledDrug = (auth, admission_id, payload) => async (dispatch) => {
  try {
    const response = await createScheduledDrug(auth, admission_id, payload);
    dispatch(appendScheduledDrug(response));
  } catch (error) {
    console.log("ADD_SCHEDULE_ERROR ", error);
  }
};

export const addScheduledLabTest = (auth, admission_id, payload) => async (dispatch) => {
  try {
    const response = await createScheduledLabTest(auth, admission_id, payload);
    dispatch(appendScheduledLabTest(response));
  } catch (error) {
    console.log("ADD_SCHEDULE_ERROR ", error);
  }
};


export default InpatientSlice.reducer;
