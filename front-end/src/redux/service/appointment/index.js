import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import { apiErrorMessage } from "@/assets/api-error";


export const bookAppointment = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.BOOK_APPOINTMENT}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const createAppointment = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.CREATE_APPOINTMENT}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchAppointment = () =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_APPOINTMENTS}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}


export const fetchDoctorAppointments = (assigned_doctor__id) => {
    return new Promise((resolve, reject) => {
      axios.get(`${APP_API_URL.FETCH_DOCTOR_APPOINTMENTS}`,{
        params:{
            assigned_doctor__id: assigned_doctor__id,
        }
      })
        .then((res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(apiErrorMessage(err));
        });
    });
  };
  

export const fetchPatientAppointments = () =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_PATIENT_APPOINTMENTS}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchAppointmentsByPatientId = (patient_id) =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_PATIENT_APPOINTMENTS_BY_PATIENT_ID}`, {
            params : {
                patient_id: patient_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}