import { createSlice } from "@reduxjs/toolkit";
import {
  fetchPrescriptions,
  fetchPrescribedDrugs,
  fetchPrescriptionsPrescribedDrugs,
  fetchPublicPrescriptions,
  fetchDrugCategories,
  fetchDrugModes,
  fetchDrugStates,
  fetchDrugs
} from "@/redux/service/pharmacy";


const initialState = {
  prescriptions: [],
  prescribedDrugs: [],
  searchedPrescriptions: [],
  prescriptionsPrescribed: [],
  publicPrescriptions: [],
  drugCategories: [],
  drugModes: [],
  drugStates: [],
  drugs: [],
};

const PrescriptionSlice = createSlice({
  name: "prescriptions",
  initialState,
  reducers: {
    setPrescriptions: (state, action) => {
      state.prescriptions = action.payload;
    },
    setPublicPrescriptions: (state, action) => {
      state.publicPrescriptions = action.payload
    },
    setPrescribedDrugs: (state, action) => {
      state.prescribedDrugs = action.payload;
    },
    setPrescribedDrugsStore: (state, action) => {
      state.prescribedDrugs = [action.payload, ...state.prescribedDrugs];
    },
    setPrescriptionsPrescribedDrugs: (state, action) => {
      state.prescriptionsPrescribed = action.payload;
    },
    setSearchedPrescriptions: (state, action) => {
      state.searchedPrescriptions = action.payload;
    },
    setPrescriptionStatus: (state, action) => {
      const prescription = state.prescriptions.find(prescription => prescription.id === action.payload);
      if (prescription) {
        prescription.status = "dispensed";
      }
    },
    setDrugCategories: (state, action) => {
      state.drugCategories = action.payload;
    },
    setDrugModes: (state, action) => {
      state.drugModes = action.payload;
    },
    setDrugStates: (state, action) => {
      state.drugStates = action.payload;
    },
    setDrugs: (state, action) => {
      state.drugs = action.payload;
    },
  },
});

export const {
  setPrescriptions,
  setSearchedPrescriptions,
  setPrescriptionsPrescribedDrugs,
  setPrescribedDrugs,
  setPrescribedDrugsStore,
  setPrescriptionStatus,
  setPublicPrescriptions,
  setDrugCategories,
  setDrugModes,
  setDrugStates,
  setDrugs
} = PrescriptionSlice.actions;


export const getAllPrescriptions = (auth) => async (dispatch) => {
  try {
    const response = await fetchPrescriptions(auth);
    dispatch(setPrescriptions(response));
  } catch (error) {
    console.log("PRESCRIPTIONS_ERROR ", error);
  }
};

export const getAllPublicPrescriptions = (auth) => async (dispatch) => {
  try {
    const response = await fetchPublicPrescriptions(auth);
    dispatch(setPublicPrescriptions(response));
  } catch (error) {
    console.log("PUBLIC_PRESCRIPTIONS_ERROR ", error);
  }
};

export const getAllPrescribedDrugs = (auth, prescription_id) => async (dispatch) => {
  try {
    const response = await fetchPrescribedDrugs(auth, prescription_id);
    dispatch(setPrescribedDrugs(response));
  } catch (error) {
    console.log("PRESCRIPTIONS_DRUGS_ERROR ", error);
  }
};

export const updateStorePrescription = (payload) => async (dispatch) => {
  dispatch(setPrescribedDrugsStore(payload));
};



export const getAllPrescriptionsPrescribedDrugs = (prescription_id, auth) => async (dispatch) => {
  try {
    const response = await fetchPrescriptionsPrescribedDrugs(prescription_id, auth);
    dispatch(setPrescriptionsPrescribedDrugs(response));
  } catch (error) {
    console.log("PRESCRIPTIONS_PRESCRIBED_DRUGS_ERROR ", error);
  }
};

export const getAllSearchedPrescriptions = (first_name) => async (dispatch) => {
  try {
    const response = await searchPrescription(first_name);
    dispatch(setSearchedPrescriptions(response));
  } catch (error) {
    console.log("PRESCRIPTIONS_ERROR ", error);
  }
};

export const updatePrescriptionStatus = (id) => (dispatch) => {
  dispatch(setPrescriptionStatus(id));
};

export const getAllDrugCategories = (auth) => async (dispatch) => {
  try {
    const response = await fetchDrugCategories(auth);
    dispatch(setDrugCategories(response));
  } catch (error) {
    console.log("DRUG_CATEGORIES_ERROR ", error);
  }
};

export const getAllDrugModes = (auth) => async (dispatch) => {
  try {
    const response = await fetchDrugModes(auth);
    dispatch(setDrugModes(response));
  } catch (error) {
    console.log("DRUG_MODES_ERROR ", error);
  }
};

export const getAllDrugStates = (auth) => async (dispatch) => {
  try {
    const response = await fetchDrugStates(auth);
    dispatch(setDrugStates(response));
  } catch (error) {
    console.log("DRUG_STATES_ERROR ", error);
  }
};

export const getAllDrugs = (auth) => async (dispatch) => {
  try {
    const response = await fetchDrugs(auth);
    dispatch(setDrugs(response));
  } catch (error) {
    console.log("DRUGS_ERROR ", error);
  }
};

export default PrescriptionSlice.reducer;
