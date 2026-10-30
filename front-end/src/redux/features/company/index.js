import { createSlice } from "@reduxjs/toolkit";
import { fetchCompanyDetails, fetchFacility } from "@/redux/service/company";

const initialState = {
  companyDetails: {},
  // { facility_type, disabled_modules }, or null until the backend has said.
  facility: null,
};

const CompanySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setCompanyDetails: (state, action) => {
      state.companyDetails = action.payload;
    },
    setFacility: (state, action) => {
      state.facility = action.payload;
    },
  },
});

export const { setCompanyDetails, setFacility } = CompanySlice.actions;

export const getCompanyDetails = (auth) => async (dispatch) => {
    try {
      const response = await fetchCompanyDetails(auth);
      dispatch(setCompanyDetails(response));
    } catch (error) {
      console.log("FETCH_COMPANY_DETAILS_ERROR ", error);
    }
};

export const getFacility = (auth) => async (dispatch) => {
    try {
      const response = await fetchFacility(auth);
      dispatch(setFacility(response));
    } catch (error) {
      console.log("FETCH_FACILITY_ERROR ", error);
    }
};


export default CompanySlice.reducer;
