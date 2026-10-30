import { createSlice } from "@reduxjs/toolkit";
import { fetchDoctors, fetchNurses } from "@/redux/service/doctor";


const initialState = {
  doctors: [],
  nurses: [],
};

const DoctorSlice = createSlice({
  name: "doctors",
  initialState,
  reducers: {
    setDoctors: (state, action) => {
      state.doctors = action.payload;
    },
    setNurses: (state, action) => {
      state.nurses = action.payload;
    },
  },
});

export const { setDoctors, setNurses } = DoctorSlice.actions;


export const getAllDoctors = (auth) => async (dispatch) => {
  try {
    const response = await fetchDoctors(auth);
    dispatch(setDoctors(response));
  } catch (error) {
    console.log("DOCTORS_ERROR ", error);
  }
};

export const getAllNurses = (auth) => async (dispatch) => {
  try {
    const response = await fetchNurses(auth);
    dispatch(setNurses(response));
  } catch (error) {
    console.log("NURSES_ERROR ", error);
  }
};


export default DoctorSlice.reducer;
