import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";


export const fetchPatientBillingAppointments = (patient__id) =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_PATIENT_BILLING_APPOINTMENTS}`,{
            params:{
                patient__id: patient__id,
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

export const fetchPatientBillingLabRequest = (patient_id) =>{
    // const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_PATIENT_BILLING_LAB_REQUEST}`,{
            params:{
                patient_id: patient_id,
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

export const fetchPatientBillingPrescribedDrug = (patient_id) =>{
    // const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_PATIENT_BILLING_PRESCRIBED_DRUG}`,{
            params:{
                patient_id: patient_id,
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

export const billingInvoiceItems = (auth,payloads) =>{
    const axiosInstance = UseAxios(auth);
    const requestData = {
        auth,
        ...payloads,
      };
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.BILLING_INVOICE_ITEMS}`,requestData)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateInvoiceItems = (auth,payloads, invoice_item) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.BILLING_INVOICE_ITEMS}`,payloads , {
            params: {
                invoice_item:invoice_item
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                console.log("THZ THE FUCKING ERROR", err)
                if(err.response.status === 422){
                    reject(err.response.data.error)
                }else{
                    reject(err.message)
                }
            })
    })
}

export const getBillingInvoiceItems = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.BILLING_INVOICE_ITEMS}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const billingInvoices = (auth,payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.BILLING_INVOICES}`,payload,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const payInvoices = (auth, payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.PAY_INVOICES}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const allocatePayment = (auth, payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`/api/billing/allocate-payment`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updateInvoices = (auth, invoice, payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.BILLING_INVOICES}`,payload,{
            params: {
                invoice_id: invoice
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

export const payBillingInvoices = (auth,payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.put(`${APP_API_URL.BILLING_INVOICES}`,payload,auth)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}


export const fetchInvoices = (auth, processFilter, selectedSearchFilter, status) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_INVOICES}`, {
            params: {
                search_field: selectedSearchFilter.value ? selectedSearchFilter.value : null,
                search_value: processFilter.search,
                status: status && status !== 'all' ? status : undefined,
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

export const fetchPatientInvoices = (auth, patient_id) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FeTCH_PATIENT_INVOICES}`,{
            params:{
                patient_id: patient_id,
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

export const fetchInvoiceItemsByInvoiceId = (auth, invoice_id) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_INVOICE_ITEMS_BY_INVOICE}`,{
            params:{
                invoice_id: invoice_id,
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


export const fetchPaymentModes = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.PAYMENT_MODES}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const fetchPaymentReceipts = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`/api/billing/payment-receipts/`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const createPaymentModes = (auth, payload) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.PAYMENT_MODES}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err.message)
            })
    })
}

export const updatePaymentModes = (auth, payload, payment_mode_id) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.PAYMENT_MODES}`,payload, {
            params: {
                mode_id: payment_mode_id
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