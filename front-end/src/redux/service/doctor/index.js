import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";


export const createDoctor = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.CREATE_DOCTOR}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}


export const fetchDoctors = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_DOCTOR}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchNurses = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_NURSES}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}