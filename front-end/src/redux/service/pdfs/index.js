import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";

export const downloadPDF = (item_id, item_name, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance
            .get(`${APP_API_URL.DOWNLOAD_PDF}`, {
                params: { item_id, item_name },
                responseType: 'arraybuffer'
            })
            .then((res) => {
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                resolve({ url });
            })
            .catch((err) => {
                reject(err.message);
            });
    });
};

export const downloadResultPDF = (item_id, item_name, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance
            .get(`${APP_API_URL.DOWNLOAD_RESULT_PDF}`, {
                params: { item_id, item_name },
                responseType: 'arraybuffer'
            })
            .then((res) => {
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                resolve({ url });
            })
            .catch((err) => {
                reject(err.message);
            });
    });
};

export const saleByDateRangePdf = () =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.SALE_BY_DATE_RANGE_PDF}`)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(err.message)
        })
    })
}

export const saleByDateRangeAndItemPdf = () =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.SALE_BY_DATE_RANGE_AND_ITEM_PDF}`)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(err.message)
        })
    })
}