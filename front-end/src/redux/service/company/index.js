import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";

export const fetchCompanyDetails = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_COMPANY_INFO}`, auth)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(err.message)
        })
    });
}

export const updateCompanyInformation = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.put(`${APP_API_URL.FETCH_COMPANY_INFO}`,{
            body:payload,
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                console.log("COMPANY_STATUS_UPDATE_ERROR ",err)
                reject(err.message)
            })
    })
}

