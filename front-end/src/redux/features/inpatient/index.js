import { createSlice } from "@reduxjs/toolkit";
import { fetchInpatients, fetchWards } from "@/redux/service/inpatient";

const initialState = {
  wards: [],
  inpatients: [],
};

const InpatientSlice = createSlice({
  name: "inpatients",
  initialState,
  reducers: {
    setWards: (state, action) => {
      state.wards = action.payload;
    },
    setInpatients: (state, action) => {
      state.inpatients = action.payload;
    },
  },
});

export const { setWards, setInpatients } = InpatientSlice.actions;


export const getAllWards = (auth) => async (dispatch) => {
  try {
    const response = await fetchWards(auth);
    dispatch(setWards(response));
  } catch (error) {
    console.log("DOCTORS_ERROR ", error);
  }
};

export const getAllInpatients = (auth) => async (dispatch) => {
  try {
    const response = await fetchInpatients(auth);
    dispatch(setInpatients(response));
  } catch (error) {        

    console.log("INPATIENT_ERROR ", error);
  }
};


export default InpatientSlice.reducer;
