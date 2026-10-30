import { createSlice } from "@reduxjs/toolkit";
import { fetchInsurance, fetchInventoryInsurancePrices } from "@/redux/service/insurance";


const initialState = {
  insurance: [],
  insurancePrices: []
};

const InsuranceSlice = createSlice({
  name: "insurance",
  initialState,
  reducers: {
    setInsurance: (state, action) => {
      state.insurance = action.payload;
    },
    createInsuranceStore: (state, action) => {
      state.insurance = [action.payload, ...state.insurance]
    },
    updateInsuranceToStoreOnPatch: (state, action) => {

      // Find the index of the item with the same id as action.payload.id
      const index = state.insurance.findIndex(insurance => parseInt(insurance.id) === parseInt(action.payload.id));

      if (index !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.insurance[index] = {
          ...state.insurance[index], // Keep existing properties
          ...action.payload       // Override with new data
        };
      }
    },
    setInsurancePrices: (state, action) => {
      state.insurancePrices = action.payload;
    },
    createInsurancePriceStore: (state, action) => {
      state.insurancePrices = [action.payload, ...state.insurancePrices]
    },
    updateInsurancePriceStore: (state, action) => {

      // Find the index of the item with the same id as action.payload.id
      const index = state.insurancePrices.findIndex(insurancePrice => parseInt(insurancePrice.id) === parseInt(action.payload.id));

      if (index !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.insurancePrices[index] = {
          ...state.insurancePrices[index], // Keep existing properties
          ...action.payload       // Override with new data
        };
      }
    },
  },
});

export const { 
  setInsurance, updateInsuranceToStoreOnPatch, createInsuranceStore,
  setInsurancePrices, createInsurancePriceStore, updateInsurancePriceStore
 } = InsuranceSlice.actions;


export const getAllInsurance = (auth) => async (dispatch) => {
  try {
    const response = await fetchInsurance(auth);
    dispatch(setInsurance(response));
  } catch (error) {
    console.log("INSURANCE_ERROR ", error);
  }
};

export const getAllInventoryInsurancePrices = (auth) => async (dispatch) => {
  try {
    const response = await fetchInventoryInsurancePrices(auth);
    dispatch(setInsurancePrices(response));
  } catch (error) {
    console.log("INSURANCE_PRICES_ERROR ", error);
  }
};

export const createAInsurancePriceStore = (payload) => (dispatch) => {
  dispatch(createInsurancePriceStore(payload));
};

export const updateAInsurancePriceStore = (payload) => (dispatch) => {
  dispatch(updateInsurancePriceStore(payload));
};

export const createAInsuranceToStore = (payload) => (dispatch) => {
  dispatch(createInsuranceStore(payload));
};

export const updateInsuranceToStore = (payload) => (dispatch) => {
  dispatch(updateInsuranceToStoreOnPatch(payload));
};

export default InsuranceSlice.reducer;
