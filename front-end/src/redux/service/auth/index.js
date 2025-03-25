import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";



export const registerUser = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.REGISTER_USER}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const createUser = (payload,auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.CREATE_USER}`,payload,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const createGroup = (payload, auth) => {
    const axiosInstance = UseAxios(auth); 

    return new Promise((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.CREATE_GROUP}`, payload, { 
            headers: { 
                Authorization: `Bearer ${auth?.token}` 
            } 
        })
        .then(res => resolve(res.data))
        .catch(err => reject(err.message));
    });
};

export const addPermission = (group_id, payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.put(`${APP_API_URL.ADD_PERMISSION}/${group_id}/`, payload,{
            headers: {
                Authorization: `Bearer ${auth?.token}`
            }
        })
            .then((res) => {
                resolve(res.data);
            })
            .catch((err) => {
                reject(err.message);
            });
    });
};

export const fetchUserPermissions = (user_id) =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.GET_USER_PERMISSIONS}`,{
            params:{
                user_id: user_id
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

export const fetchGroupPermissions = (group_id, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_GROUP_PERMISSIONS}`,{
            params:{
                group_id: group_id
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

export const fetchGroups = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_GROUP}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchAllThePermissions = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_ALL_PERMISSIONS}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPatientGroup = (name) =>{
    const axiosInstance = UseAxios();
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_PATIENT_GROUP}`,{
            params:{
                name: name
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

export const fetchDepartments = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_DEPARTMENTS}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const resetPassword = async (email) => {
    try {
        const response = await axios.post(`${APP_API_URL.PASSWORD_RESET}`, { email });
        return response.data; 

    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to reset password");
    }
};

export const updatePassword = async (uidb64, token, new_password, confirm_password) => {
    try {
        if (!uidb64 || !token) {
            throw new Error("Missing UID or token");
        }

        const response = await axios.post(
            `${APP_API_URL.CHANGE_PASSWORD}/${uidb64}/${token}/`,
            { new_password, confirm_password }
        );

        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to update password");
    }
};

