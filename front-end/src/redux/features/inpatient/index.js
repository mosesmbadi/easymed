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
    addBedToStore: (state, action) => {
      state.beds = [action.payload, ...state.beds];
    }
  },
});

export const { fetchBeds, fetchWards, addBedToStore } = InpatientSlice.actions;

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

export const updateBedStoreAfterPost = (response) => async (dispatch) => {
  dispatch(addBedToStore(response))  
}

export default InpatientSlice.reducer;
