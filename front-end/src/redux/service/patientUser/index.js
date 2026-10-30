import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";

export const patientLabtestRequest = (payload) => {
    return new Promise ((resolve, reject)=> {
        axios.post(`${APP_API_URL.PATIENTLABTESTREQUEST}`, payload)
        .then((res)=> {
            resolve(res.data)
        }).catch((err)=>{
            reject(err.message)
        });
    });
}

export const patientPublicPrescriptionRequest = (payload) => {
    return new Promise ((resolve, reject)=> {
        axios.post(`${APP_API_URL.PATIENTPRESCRIPTIONREQUEST}`, payload)
        .then((res)=> {
            resolve(res.data)
        })
        .catch((err)=>{
            reject(err.message)
        })
    })
}