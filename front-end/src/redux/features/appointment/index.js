import { createSlice } from "@reduxjs/toolkit";
import { fetchAppointment, fetchDoctorAppointments, fetchPatientAppointments, fetchAppointmentsByPatientId } from "@/redux/service/appointment";


const initialState = {
  appointments: [],
  patientAppointments:[],
  appointmentsByPatientsId:[],
  doctorAppointments:[]
};

const AppointmentSlice = createSlice({
  name: "appointments",
  initialState,
  reducers: {
    setAppointments: (state, action) => {
      state.appointments = action.payload;
    },
    setPatientAppointments: (state, action) => {
      state.patientAppointments = action.payload;
    },
    setAppointmentsByPatients: (state, action) => {
      state.appointmentsByPatientsId = action.payload;
    },
    setDoctorAppointments: (state, action) => {
      state.doctorAppointments = action.payload;
    },
  },
});

export const { setAppointments,setPatientAppointments,setDoctorAppointments, setAppointmentsByPatients } = AppointmentSlice.actions;


export const getAllAppointments = () => async (dispatch) => {
  try {
    const response = await fetchAppointment();
    dispatch(setAppointments(response));
  } catch (error) {
    console.log("APPOINTMENTS_ERROR ", error);
  }
};

export const getAllDoctorAppointments = (assigned_doctor__id) => async (dispatch) => {
  try {
    const response = await fetchDoctorAppointments(assigned_doctor__id);
    dispatch(setDoctorAppointments(response));
  } catch (error) {
    console.log("DOCTOR_APPOINTMENTS_ERROR ", error);
  }
};

export const getAllPatientAppointments = () => async (dispatch) => {
  try {
    const response = await fetchPatientAppointments();
    dispatch(setPatientAppointments(response));
  } catch (error) {
    console.log("APPOINTMENTS_ERROR ", error);
  }
};

export const getAllAppointmentsByPatientId = (patiend_id) => async (dispatch) => {
  try {
    const response = await fetchAppointmentsByPatientId(patiend_id);
    dispatch(setAppointmentsByPatients(response));
  } catch (error) {
    console.log("APPOINTMENTS_BY_PATIENT_ID_ERROR ", error);
  }
};

export default AppointmentSlice.reducer;
