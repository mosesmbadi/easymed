import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import { apiErrorMessage } from "@/assets/api-error";

export const patientLabtestRequest = (payload) => {
    return new Promise ((resolve, reject)=> {
        axios.post(`${APP_API_URL.PATIENTLABTESTREQUEST}`, payload)
        .then((res)=> {
            resolve(res.data)
        }).catch((err)=>{
            reject(apiErrorMessage(err))
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
            reject(apiErrorMessage(err))
        })
    })
}