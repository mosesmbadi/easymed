import { fetchFacilityBeds, fetchFacilityWards } from "@/redux/service/inpatient";
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  beds: [],
  wards: [],
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
  },
});

export const { fetchBeds, fetchWards } = InpatientSlice.actions;

export const fetchHospitalBeds = (auth) => async (dispatch) => {
  try {
    const response = await fetchFacilityBeds(auth);
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

export default InpatientSlice.reducer;
