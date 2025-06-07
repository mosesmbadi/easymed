import { createSlice } from "@reduxjs/toolkit";
import { fetchWards } from "@/redux/service/doctor";


const initialState = {
  wards: [],
};

const DoctorSlice = createSlice({
  name: "doctors",
  initialState,
  reducers: {
    setWards: (state, action) => {
      state.wards = action.payload;
    },
  },
});

export const { setWards } = WardsSlice.actions;


export const getAllWards = (auth) => async (dispatch) => {
  try {
    const response = await fetchWards(auth);
    dispatch(setWards(response));
  } catch (error) {
    console.log("WARDS_ERROR ", error);
  }
};


export default WardsSlice.reducer;
