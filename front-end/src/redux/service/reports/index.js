import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";

export const saleByDateRange = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.SALE_BY_DATE_RANGE_GENERATE_REPORTS}`, payload)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(err.message)
        })
    })
}

export const saleByDateRangeAndItem = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.SALE_BY_DATE_RANGE_AND_ITEM_ID_GENERATE_REPORTS}`, payload)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(err.message)
        })
    })
}

export const dayTransaction = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.TOTALS_OF_THE_DAY}`, {
            params: {
                payment_method: payload.payment_method,
                date: payload.date
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


/**
 * What each item earned and what it cost, over a date range.
 *
 * Cost comes off the stock ledger, which records the unit cost of everything
 * that left the shelf, so it is measured rather than estimated -- except the
 * share of a sample collection apportioned across the tests ordered off it,
 * which the response keeps in its own column.
 */
export const grossMargin = (params, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.GROSS_MARGIN}`, { params })
        .then((res) => {
            resolve(res.data)
        })
        .catch((err) => {
            reject(err.response?.data?.detail ?? err.message)
        })
    })
}
