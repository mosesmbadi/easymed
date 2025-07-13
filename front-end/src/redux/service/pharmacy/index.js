import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";

export const fetchPrescriptions = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_PRESCRIPTION}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPublicPrescriptions = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_PUBLIC_PRESCRIPTION}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPrescribedDrugs = (auth, prescription_id="") =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_PRESCRIBED_DRUGS}`, {
            params: {
                prescription_id: prescription_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPrescriptionsPrescribedDrugs = (prescription_id, auth) =>{

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_PRESCRIPTIONS_PRESCRIBED_DRUGS}`,{
            params:{
                prescription_id: prescription_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updatePrescription = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.FETCH_PRESCRIPTION}`,{status: payload.status}, {
            params: {
                prescription_id: payload.prescription
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                console.log("PRESCRIPTION_STATUS_UPDATE_ERROR ",err)
                reject(err.message)
            })
    })
}