import { createSlice } from "@reduxjs/toolkit";
import { fetchCompanyDetails, fetchFacility } from "@/redux/service/company";

const initialState = {
  companyDetails: {},
  // { facility_type, enabled_modules, disabled_modules }, or null until the
  // backend has said.
  facility: null,
  // idle | loading | loaded | failed. A failed load shows every module rather
  // than hiding them: the backend still refuses writes to a switched-off one.
  facilityStatus: "idle",
  facilityFailures: 0,
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
      state.facilityStatus = "loaded";
      state.facilityFailures = 0;
    },
    setFacilityLoading: (state) => {
      state.facilityStatus = "loading";
    },
    setFacilityFailed: (state) => {
      state.facilityStatus = "failed";
      state.facilityFailures += 1;
    },
  },
});

export const { setCompanyDetails, setFacility, setFacilityLoading, setFacilityFailed } =
  CompanySlice.actions;

export const getCompanyDetails = (auth) => async (dispatch) => {
    try {
      const response = await fetchCompanyDetails(auth);
      dispatch(setCompanyDetails(response));
    } catch (error) {
      console.log("FETCH_COMPANY_DETAILS_ERROR ", error);
    }
};

export const getFacility = (auth) => async (dispatch) => {
    dispatch(setFacilityLoading());
    try {
      const response = await fetchFacility(auth);
      dispatch(setFacility(response));
    } catch (error) {
      console.log("FETCH_FACILITY_ERROR ", error);
      dispatch(setFacilityFailed());
    }
};


export default CompanySlice.reducer;
