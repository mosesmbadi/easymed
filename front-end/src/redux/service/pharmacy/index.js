import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";

export const fetchPrescriptions = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.FETCH_PRESCRIPTION}`, auth)
            .then((res) => {
                resolve(res.data)
            })
            .catch((err) => {
                reject(err.message)
            })
    })
}

export const fetchPublicPrescriptions = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.FETCH_PUBLIC_PRESCRIPTION}`, auth)
            .then((res) => {
                resolve(res.data)
            })
            .catch((err) => {
                reject(err.message)
            })
    })
}

export const fetchPrescribedDrugs = (auth, prescription_id = "") => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.FETCH_PRESCRIBED_DRUGS}`, {
            params: {
                prescription_id: prescription_id,
            },
        })
            .then((res) => {
                resolve(res.data)
            })
            .catch((err) => {
                reject(err.message)
            })
    })
}

export const fetchPrescriptionsPrescribedDrugs = (prescription_id, auth) => {

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.FETCH_PRESCRIPTIONS_PRESCRIBED_DRUGS}`, {
            params: {
                prescription_id: prescription_id,
            },
        })
            .then((res) => {
                resolve(res.data)
            })
            .catch((err) => {
                reject(err.message)
            })
    })
}

export const updatePrescription = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.patch(`${APP_API_URL.FETCH_PRESCRIPTION}`, { status: payload.status }, {
            params: {
                prescription_id: payload.prescription
            }
        })
            .then((res) => {
                resolve(res.data)
            })
            .catch((err) => {
                console.log("PRESCRIPTION_STATUS_UPDATE_ERROR ", err)
                reject(err.message)
            })
    })
}

export const fetchDrugCategories = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.DRUG_CATEGORIES}`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const createDrugCategory = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.DRUG_CATEGORIES}`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const updateDrugCategory = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.patch(`${APP_API_URL.DRUG_CATEGORIES}${payload.id}/`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const deleteDrugCategory = (id, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.delete(`${APP_API_URL.DRUG_CATEGORIES}${id}/`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const fetchDrugModes = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.DRUG_MODES}`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const createDrugMode = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.DRUG_MODES}`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const updateDrugMode = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.patch(`${APP_API_URL.DRUG_MODES}${payload.id}/`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const deleteDrugMode = (id, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.delete(`${APP_API_URL.DRUG_MODES}${id}/`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const fetchDrugStates = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.DRUG_STATES}`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const createDrugState = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.DRUG_STATES}`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const updateDrugState = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.patch(`${APP_API_URL.DRUG_STATES}${payload.id}/`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const deleteDrugState = (id, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.delete(`${APP_API_URL.DRUG_STATES}${id}/`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const fetchDrugs = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.DRUGS}`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const createDrug = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.DRUGS}`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const updateDrug = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.patch(`${APP_API_URL.DRUGS}${payload.id}/`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}

export const deleteDrug = (id, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.delete(`${APP_API_URL.DRUGS}${id}/`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err.message))
    })
}