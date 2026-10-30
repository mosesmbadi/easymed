import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";


export const fetchInsurance = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_INSURANCE}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchInventoryInsurancePrices = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.INSURANCE_INVENTORY_PRICES}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

// Fetch insurance price for a specific item and insurance company
export const fetchInsurancePriceForItem = (auth, itemId, insuranceCompanyId) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.INSURANCE_INVENTORY_PRICES}`, {
            params: {
                item: itemId,
                insurance_company: insuranceCompanyId
            }
        })
            .then((res) =>{
                // API returns an array, we want the first (and should be only) match
                const data = res.data;
                if (Array.isArray(data) && data.length > 0) {
                    resolve(data[0]);
                } else {
                    resolve(null);
                }
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const createInventoryInsurancePrices = (auth, payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.INSURANCE_INVENTORY_PRICES}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateInventoryInsurancePrices = (insurance_price_id, payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.INSURANCE_INVENTORY_PRICES}`, payload, {
            params: {
                insurance_price_id: insurance_price_id
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

export const createInsurance = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) => {
        axiosInstance.post(`${APP_API_URL.FETCH_INSURANCE}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateInsurance  = (insurance_id, payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) => {
        axiosInstance.patch(`${APP_API_URL.FETCH_INSURANCE}`, payload, {
            params: {
                insurance_id: insurance_id
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
