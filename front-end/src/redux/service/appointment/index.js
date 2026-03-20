import api from "@/utils/api";

const APPOINTMENTS_URL = '/patients/appointments/'; // ✅ direct Django endpoint

export const createAppointment = (payload) => {
  return new Promise((resolve, reject) => {
    api.post(APPOINTMENTS_URL, payload)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};

export const fetchAppointment = () => {
  return new Promise((resolve, reject) => {
    api.get(APPOINTMENTS_URL)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};

export const fetchDoctorAppointments = (assigned_doctor__id) => {
  return new Promise((resolve, reject) => {
    api.get(APPOINTMENTS_URL, { params: { doctor: assigned_doctor__id } })
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};

export const fetchPatientAppointments = () => {
  return new Promise((resolve, reject) => {
    api.get(APPOINTMENTS_URL, { params: { patient: 'me' } })
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};

export const fetchAppointmentsByPatientId = (patient_id) => {
  return new Promise((resolve, reject) => {
    api.get(APPOINTMENTS_URL, { params: { patient: patient_id } })
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};

// ✅ Fixed: use detail URL for update
export const updateAppointment = (id, payload) => {
  return new Promise((resolve, reject) => {
    api.put(`${APPOINTMENTS_URL}${id}/`, payload)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};

// ✅ Fixed: use detail URL for delete
export const deleteAppointment = (id) => {
  return new Promise((resolve, reject) => {
    api.delete(`${APPOINTMENTS_URL}${id}/`)
      .then((res) => resolve(res.data))
      .catch((err) => reject(err.response?.data || err.message));
  });
};