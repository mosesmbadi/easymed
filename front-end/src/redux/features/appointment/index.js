import { createSlice } from "@reduxjs/toolkit";
import {
  fetchAppointment,
  fetchDoctorAppointments,
  fetchPatientAppointments,
  fetchAppointmentsByPatientId,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from "@/redux/service/appointment";

const initialState = {
  appointments: [],
  patientAppointments: [],
  appointmentsByPatientsId: [],
  doctorAppointments: [],
  loading: false,
  error: null,
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
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setAppointments,
  setPatientAppointments,
  setDoctorAppointments,
  setAppointmentsByPatients,
  setLoading,
  setError,
} = AppointmentSlice.actions;

export const getAllAppointments = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await fetchAppointment();
    dispatch(setAppointments(response));
  } catch (error) {
    console.log("APPOINTMENTS_ERROR ", error);
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
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

export const getAllAppointmentsByPatientId = (patient_id) => async (dispatch) => {
  try {
    const response = await fetchAppointmentsByPatientId(patient_id);
    dispatch(setAppointmentsByPatients(response));
  } catch (error) {
    console.log("APPOINTMENTS_BY_PATIENT_ID_ERROR ", error);
  }
};

export const addAppointment = (data) => async (dispatch) => {
  try {
    const response = await createAppointment(data);
    dispatch(getAllAppointments()); // refresh list
    return response;
  } catch (error) {
    console.log("CREATE_APPOINTMENT_ERROR ", error);
    throw error;
  }
};

export const editAppointment = (id, data) => async (dispatch) => {
  try {
    const response = await updateAppointment(id, data);
    dispatch(getAllAppointments()); // refresh list
    return response;
  } catch (error) {
    console.log("UPDATE_APPOINTMENT_ERROR ", error);
    throw error;
  }
};

export const removeAppointment = (id) => async (dispatch) => {
  try {
    await deleteAppointment(id);
    dispatch(getAllAppointments()); // refresh list
  } catch (error) {
    console.log("DELETE_APPOINTMENT_ERROR ", error);
    throw error;
  }
};

export default AppointmentSlice.reducer;