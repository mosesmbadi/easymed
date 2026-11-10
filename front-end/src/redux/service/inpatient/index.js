import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";
import { apiErrorMessage } from "@/assets/api-error";


export const createFacilityBed = (auth, payload, ward_id) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.INPATIENT_BEDS}`, payload, {
            params: {
                ward_id: ward_id
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

export const editFacilityBed = (auth, payload, ward_id, bed_id) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.INPATIENT_BEDS}`,payload, {
            params: {
                ward_id: ward_id,
                bed_id: bed_id
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


export const fetchFacilityBeds = (auth, ward_id) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.INPATIENT_BEDS}`, {
            params: {
                ward_id: ward_id
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

export const createFacilityWards = (auth, payload) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.INPATIENT_WARDS}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const editFacilityWard = (auth, payload, ward_id) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.INPATIENT_WARDS}`,payload, {
            params: {
                ward_id: ward_id
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

export const fetchFacilityWards = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.INPATIENT_WARDS}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const admitPatient = (auth, payload) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.ADMIT_PATIENT}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const dischargePatient = (auth, payload, admission_id) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.DISCHARGE_PATIENT}`,payload, {
            params: {
                admission_id: admission_id
            }})
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchAdmittedPatients = (auth, ward, admission_id='', processFilter={}, selectedSearchFilter={}) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.ADMIT_PATIENT}`, {
            params: {
                ward: ward,
                admission_id: admission_id,
                search_field: selectedSearchFilter.value ? selectedSearchFilter.value : null,
                search_value: processFilter.search,
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) => {
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchAdmittedPatientsVitals = (auth, admission_id='') =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.ADMITTED_PATIENT_VITALS}`, {
            params: {
                admission_id: admission_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) => {
                reject(apiErrorMessage(err))
            })
    })
}

export const AddAdmittedPatientsVitals = (auth, payload, admission_id) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.ADMITTED_PATIENT_VITALS}`, payload, {
            params: {
                admission_id: admission_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) => {
                reject(apiErrorMessage(err))
            })
    })
}

export const updateAdmissionDetails = (auth, payload, admission_id) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.ADMIT_PATIENT}`,payload, {
            params: {
                admission_id: admission_id
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

export const createNurseDuty = (auth, payload) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.INPATIENT_NURSE_DUTIES}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchNursesDuties = (auth, ward_id) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.INPATIENT_NURSE_DUTIES}`, {
            params: {
                ward_id: ward_id
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

export const updateNursesDuties = (auth, payload, duty_id) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.INPATIENT_NURSE_DUTIES}`,payload, {
            params: {
                duty_id: duty_id
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

export const fetchAdmittedPatientSchedules = (auth, admission_id) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.ADMITTED_PATIENT_SCHEDULES}`, {
            params: {
                admission_id: admission_id
            }
        })
            .then((res) => {
                resolve(res.data);
            })
            .catch((err) => {
                reject(apiErrorMessage(err));
            });
    });
}


export const updateSheduledDrug = (auth, admission_id, scheduled_drug_id, payload) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.patch(`${APP_API_URL.ADMITTED_PATIENT_SCHEDULED_DRUGS}`, payload, {
            params: {
                admission_id: admission_id,
                scheduled_drug_id: scheduled_drug_id
            }
        })
            .then((res) => {
                resolve(res.data);
            })
            .catch((err) => {
                reject(apiErrorMessage(err));
            });
    });
}

export const createScheduledDrug = (auth, admission_id, payload) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.ADMITTED_PATIENT_SCHEDULED_DRUGS}`, payload, {
            params: {
                admission_id: admission_id,
            }
        })
            .then((res) => {
                resolve(res.data);
            })
            .catch((err) => {
                reject(apiErrorMessage(err));
            });
    });
}

export const createScheduledLabTest = (auth, admission_id, payload) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.ADMITTED_PATIENT_SCHEDULED_LAB_TEST}`, payload, {
            params: {
                admission_id: admission_id,
            }
        })
            .then((res) => {
                resolve(res.data);
            })
            .catch((err) => {
                reject(apiErrorMessage(err));
            });
    });
}

