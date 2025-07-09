import { fetchAdmittedPatients, fetchFacilityBeds, fetchFacilityWards, fetchNursesDuties } from "@/redux/service/inpatient";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  beds: [],
  wards: [],
  patients: [],
  assignedNurses: [],
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
    updateAdmissionInStore: (state, action) => {
      const updatedAdmission = action.payload;
      state.patients = state.patients.map((patient) =>
        patient.id === updatedAdmission.id ? updatedAdmission : patient
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
  admittedPatients, updateAdmissionInStore,
  assignedNurses
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

export const fetchAdmitted = (auth, ward) => async (dispatch) => {
  try {
    const response = await fetchAdmittedPatients(auth, ward);
    dispatch(admittedPatients(response));
  } catch (error) {
    console.log("ADMITTED_PATIENTS_ERROR ", error);
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


export default InpatientSlice.reducer;
