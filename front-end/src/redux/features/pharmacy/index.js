import { createSlice } from "@reduxjs/toolkit";
import { fetchPrescriptions, fetchPrescribedDrugs, fetchPrescriptionsPrescribedDrugs, fetchPublicPrescriptions } from "@/redux/service/pharmacy";


const initialState = {
  prescriptions: [],
  prescribedDrugs: [],
  searchedPrescriptions: [],
  prescriptionsPrescribed: [],
  publicPrescriptions: [],
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
    setPrescriptionsPrescribedDrugs: (state, action) => {
      state.prescriptionsPrescribed = action.payload;
    },
    setSearchedPrescriptions: (state, action) => {
      state.searchedPrescriptions = action.payload;
    },
    setPrescriptionStatus: (state, action) => {
      const prescription = state.prescriptions.find(prescription => prescription.id === action.payload );
     prescription.status = "dispensed"
    },
  },
});

export const { setPrescriptions,setSearchedPrescriptions, setPrescriptionsPrescribedDrugs, setPrescribedDrugs, setPrescriptionStatus, setPublicPrescriptions } = PrescriptionSlice.actions;


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

export default PrescriptionSlice.reducer;
