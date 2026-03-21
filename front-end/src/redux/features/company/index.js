import { createSlice } from "@reduxjs/toolkit";
import { fetchCompanyDetails } from "@/redux/service/company";

const initialState = {
  companyDetails: {},
};

const CompanySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setCompanyDetails: (state, action) => {
      state.companyDetails = action.payload;
    },
  },
});

export const { setCompanyDetails } = CompanySlice.actions;

export const getCompanyDetails = (auth) => async (dispatch) => {
    try {
      const response = await fetchCompanyDetails(auth);
      dispatch(setCompanyDetails(response));
    } catch (error) {
      console.log("FETCH_COMPANY_DETAILS_ERROR ", error);
    }
};


export default CompanySlice.reducer;