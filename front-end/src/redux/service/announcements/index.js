import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";
import { apiErrorMessage } from "@/assets/api-error";

export const fetchAnnouncements = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_ANNOUNCEMENTS}`)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(apiErrorMessage(err))
        })
    });
}

export const postAnnouncements = (auth, payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_ANNOUNCEMENTS}`, payload)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(apiErrorMessage(err))
        })
    });
}

export const fetchAnnouncementChannels = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_ANNOUNCEMENTS_CHANNELS}`)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(apiErrorMessage(err))
        })
    });
}


export const createAnnouncementChannels = (auth, payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_ANNOUNCEMENTS_CHANNELS}`, payload)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(apiErrorMessage(err))
        })
    });
}

export const updateAnnouncementChannels = (channel_id, payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.FETCH_ANNOUNCEMENTS_CHANNELS}`, payload, {
            params: {
                channel_id: channel_id
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