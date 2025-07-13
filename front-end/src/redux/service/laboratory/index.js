import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";


export const fetchLabResults = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_LAB_RESULTS}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchLabRequests = (auth, process_id="") =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_LAB_REQUESTS}`, {
            params: {
                process_id: process_id
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

export const fetchLabRequestsDetails = (test_id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_ONE_LAB_REQUESTS}`,{
            params: {
                test_id: test_id
            }
        },auth)
        .then((res) =>{
            resolve(res.data)
        })
        .catch((err) =>{
            reject(err.message)
        })
    })
}


export const fetchQualitativeLabRequests = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.QUALITATIVE_LAB_TEST_RESULTS}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchLabEquipment = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_LAB_EQUIPMENT}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const createLabEquipment = (auth, payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_LAB_EQUIPMENT}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateLabEquipment = (equipment_id, payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.FETCH_LAB_EQUIPMENT}`, payload, {
            params: {
                equipment_id: equipment_id
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

export const fetchLabTestPanels = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_LAB_TEST_PANELS}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const createLabTestPanels = ( payload , auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_LAB_TEST_PANELS}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateLabTestPanel = ( panel_id, payload , auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.FETCH_LAB_TEST_PANELS}`, payload, {
            params: {
                panel_id: panel_id
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

export const sendLabRequestsPanels = (payload,auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_LAB_TEST_REQUEST_PANELS}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateLabRequestPanels = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.FETCH_LAB_TEST_REQUEST_PANELS}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}


export const fetchLabTestPanelsByProfileId = (profile_id, auth) =>{

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_LAB_TEST_PANELS_BY_PROFILE_ID}`,{
            params:{
                profile_id: profile_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const sendLabRequests = (payload,auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.SEND_LAB_REQUESTS}`,payload,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateLabRequest = (test_req_id, payload,auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.SEND_LAB_REQUESTS}`,payload,{
            params: {
                test_id:test_req_id
            }
        }
        )
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const sendLabResults = (payload,auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.SEND_LAB_RESULTS}`,payload,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const sendLabResultQualitative = (payload,auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.QUALITATIVE_LAB_TEST_RESULTS}`,payload,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const addTestResultPanel = (payload,auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_LAB_TEST_RESULT_PANELS}`,payload,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const addQualitativeTestResultPanel = (payload,auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.QUALITATIVE_LAB_TEST_RESULTS_PANEL_ITEM}`,payload,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const sendToEquipment = (payload) => {
    return new Promise((resolve, reject) => {
        fetch(APP_API_URL.LAB_EQUIPMENT_PARSER, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'error') {
                reject({ 
                    status: 'error',
                    message: result.message || 'Equipment communication error'
                });
            } else {
                resolve({
                    status: 'success',
                    message: result.message || 'Successfully sent to equipment'
                });
            }
        })
        .catch(err => {
            console.error('Equipment communication error:', err);
            reject({ 
                status: 'error',
                message: err.message || 'Failed to communicate with equipment'
            });
        });
    });
};

export const publicLabRequest = (payload) =>{

    console.log("THIS IS THE PAYLOAD", payload)
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.PUBLIC_LAB_REQUEST}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPublicLabRequests = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.PUBLIC_LAB_REQUEST}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updatePublicLabRequest = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.put(`${APP_API_URL.PUBLIC_LAB_REQUEST}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchLabTestProfile = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_LAB_TEST_PROFILE}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const createLabTestProfile = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) => {
        axiosInstance.post(`${APP_API_URL.FETCH_LAB_TEST_PROFILE}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })

}

export const updateLabTestProfile = (profile_id, payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) => {
        axiosInstance.patch(`${APP_API_URL.FETCH_LAB_TEST_PROFILE}`, payload, {
            params: {
                profile_id: profile_id
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

export const fetchSpecificPatientLabRequests = (patient_id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_LAB_REQUESTS_BY_PATIENT_ID}`,{
            params: {
                patient_id: patient_id
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


export const fetchLabTestPanelsByTestRequestId = (test_request_id, auth) =>{

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.GET_LAB_TEST_PANELS_BY_LAB_TEST_REQUEST_ID}`,{
            params:{
                test_request_id: test_request_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchLabTestPanelsBySpecificSample = (sample_id, auth) =>{

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.PANELS_BY_SAMPLE_ID}`,{
            params:{
                sample_id: sample_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchLabTestByProcessId = (process_id, auth) =>{

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.LAB_TEST_REQ_BY_PROCESS_ID}`,{
            params:{
                process_id: process_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}


export const fetchResultPanelsByResultsId = (result_id, auth) =>{

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_PANELS_BY_RESULT}`,{
            params:{
                result_id: result_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchQualitativeResultPanelsByResultsId = (result_id, auth) =>{

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_QUALITATIVE_PANELS_BY_RESULT}`,{
            params:{
                result_id: result_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const approveLabResult = (payload, auth) => {
    const axiosInstance = UseAxios(auth);

    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.APPROVE_LAB_RESULTS}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })

}

export const approveQualitativeLabResult = (payload, auth) => {
    const axiosInstance = UseAxios(auth);

    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.APPROVE_QUALITATIVE_LAB_RESULTS}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchSamplesForSpecificProcess = (process_id, auth) => {

    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) => {
        axiosInstance.get(`${APP_API_URL.SAMPLES_BY_process_ID}`, {
            params:{
                process_id: process_id,
            },
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })

}

export const fetchSpecimens = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) => {
        axiosInstance.get(`${APP_API_URL.SPECIMENS}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })

}

export const createSpecimen = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) => {
        axiosInstance.post(`${APP_API_URL.SPECIMENS}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })

}


export const updateSpecimen = (specimen_id, payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) => {
        axiosInstance.patch(`${APP_API_URL.SPECIMENS}`, payload, {
            params: {
                specimen_id: specimen_id
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

export const fetchPhlebotomySamples = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.PHLEBOTOMY_PATIENT_SAMPLES}`,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updatePhlebotomySamples = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.PHLEBOTOMY_PATIENT_SAMPLES}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}