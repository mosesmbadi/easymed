import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";


export const fetchServices = () =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_SERVICES}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPatient = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_PATIENT}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPatientById = (patient_id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_PATIENT_BY_ID}`, {
            params: {
                patient_id: patient_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}


export const searchPatients = (first_name) =>{
    return new Promise((resolve,reject) =>{
        console.log("PATIENT_URL ",`${APP_API_URL.SEARCH_PATIENT}`)
        axios.get(`${APP_API_URL.SEARCH_PATIENT}`,{
            params:{
                first_name:first_name,
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPatientProfile = (auth, userId) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.GET_PATIENT_PROFILE}`,{
            params:{
                userId: userId
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const createPatient = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.CREATE_PATIENT}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const editPatient = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.EDIT_PATIENT}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                console.log("EDIT_ERROR ",err)
                reject(err.message)
            })
    })
}

export const deletePatient = (id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.DELETE_PATIENT}`,{id})
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                console.log("DELETE_ERROR ",err)
                reject(err.message)
            })
    })
}


export const prescribePatient = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.PRESCRIBE}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const assignDoctor = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.ASSIGN_DOCTOR}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}


export const consultPatient = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.CONSULT_PATIENT}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const referPatient = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.REFER_PATIENT}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const prescribeDrug = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.PRESCRIBE_DRUG}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updatePrescribeDrug = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.PRESCRIBE_DRUG}`,payload)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(err.message)
        })
    })
}

export const createPrescription = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.CREATE_PRESCRIPTION}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updatePrescription = (prescription_id, payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.CREATE_PRESCRIPTION}`,payload, {
            params: {
                prescription_id: prescription_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPatientTriage = (id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.GET_PATIENT_TRIAGE}`,{
            params:{
                id: id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updatePatientTriage = (id, payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.put(`${APP_API_URL.GET_PATIENT_TRIAGE}`, payload,{
            params:{
                id: id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPatientPrescribeDrugs = (patient_id) =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.PRESCRIBE_DRUG_BY_PATIENT_ID}`,{
            params:{
                patient_id: patient_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchAllAttendanceProcesses = (auth, process_id=null) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.PATIENT_ATTENDANCE_PROCESS}`, {
            params: {
                process_id: process_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const initiateNewAttendanceProcesses = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.PATIENT_ATTENDANCE_PROCESS}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateAttendanceProcesses = (payload, process_id, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.PATIENT_ATTENDANCE_PROCESS}`, payload, {
            params: {
                process_id: process_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const patientNextOfKin = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise ((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.PATIENT_KIN}`, payload)
        .then((res)=> {
            resolve(res.data)
        })
        .catch((err)=> {
            reject(err.message)
        })
    })
}

export const patientNextOfKinContact = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise ((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.PATIENT_KIN_CONTACT}`, payload)
        .then((res)=> {
            resolve(res.data)
        })
        .catch((err)=> {
            reject(err.message)
        })
    })
}