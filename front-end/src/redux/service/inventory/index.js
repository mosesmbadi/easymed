import axios from "axios";
import { APP_API_URL } from "@/assets/api-endpoints";
import UseAxios from "@/assets/hooks/use-axios";
import { apiErrorMessage } from "@/assets/api-error";



export const addInventory = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.ADD_INVENTORY}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err, "Failed to add inventory"))
            })
    })
}

export const fetchInventories = (auth, department='', item='', processFilter={ search: "" }, selectedSearchFilter={label: "", value: ""}) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_INVENTORY}`,{
            params: {
                department_name: department,
                item: item,
                search_field: selectedSearchFilter.value ? selectedSearchFilter.value : null,
                search_value: processFilter.search,
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

export const fetchItems = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_ITEMS}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchItem = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_ITEM}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchUnits = (auth, category = '') => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.FETCH_UNITS}`, {
            params: category ? { category } : {}
        })
            .then((res) => { resolve(res.data) })
            .catch((err) => { reject(apiErrorMessage(err)) })
    })
}

export const createItem = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_ITEM}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const updateItem = (item_id, payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.FETCH_ITEM}`, payload, {
            params: {
                item_id: item_id
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

export const deleteItem = (id) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.DELETE_ITEM}`,{id})
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchSuppliers = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_SUPPLIERS}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchOrderBills = () =>{
    return new Promise((resolve,reject) =>{
        axios.get(`${APP_API_URL.FETCH_ORDER_BILL}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const addRequisition = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.REQUISITION}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const updateRequisition = (payload, requisition_id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.REQUISITION}`,payload, {
            params: {
                requisition_id:requisition_id
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

/**
 * End a requisition, or undo that. `action` is one of reject | cancel | reopen.
 * Rejects with the error itself so the caller can show the server's reason --
 * these calls fail for legitimate business reasons (already ordered, already
 * closed) that the user needs to read.
 */
export const requisitionAction = (action, requisition_id, reason, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.REQUISITION_ACTION}`, { reason: reason ?? "" }, {
            params: {
                requisition_id: requisition_id,
                action: action,
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err)
            })
    })
}

export const fetchAllRequisitionItems = (auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.REQUISITION_ITEM}`)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const addRequisitionItem = (payload, requisition_id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.REQUISITION_ITEM}`,payload, {
            params: {
                requisition_id: requisition_id
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

export const updateRequisitionItem = (payload, requisition_id, requisition_item_id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.REQUISITION_ITEM}`,payload, {
            params: {
                requisition_id: requisition_id,
                requisition_item_id: requisition_item_id
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

export const deleteRequisitionItem = (requisition_id, requisition_item_id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.delete(`${APP_API_URL.REQUISITION_ITEM}`, {
            params: {
                requisition_id: requisition_id,
                requisition_item_id: requisition_item_id
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

export const fetchRequisitions = (auth, processFilter, selectedSearchFilter) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.REQUISITION}`,{
            params: {
                search_field: selectedSearchFilter.value ? selectedSearchFilter.value : null,
                search_value: processFilter.search,
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

export const addPurchaseOrder = (payload, requisition_id, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.PURCHASE_ORDER}`,payload , {
            params: {
                requisition_id: requisition_id
            }
        })
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                // Reject with the error itself, not just err.message: the
                // server's reason for a 400 lives in err.response.data and the
                // caller needs it to tell the user what went wrong.
                reject(err)
            })
    })
}

export const updatePurchaseOrder = (payload, requisition_id, purchase_order, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.PURCHASE_ORDER}`,payload , {
            params: {
                requisition_id: requisition_id,
                purchase_order: purchase_order
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

export const fetchPurchaseOrders = (auth, processFilter, selectedSearchFilter) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.PURCHASE_ORDER}`,{
            params: {
                search_field: selectedSearchFilter.value ? selectedSearchFilter.value : null,
                search_value: processFilter.search,
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

export const addPurchaseOrdersItem = (payload) =>{
    return new Promise((resolve,reject) =>{
        axios.post(`${APP_API_URL.PURCHASE_ORDER_ITEM}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchIncomingItems = (auth, filter={}, processFilter, selectedSearchFilter) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.get(`${APP_API_URL.FETCH_INCOMING_ITEMS}`, {
            params: {
                purchase_order: filter.purchase_order,
                search_field: selectedSearchFilter.value ? selectedSearchFilter.value : null,
                search_value: processFilter.search,
            }
        } )
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

/**
 * Receive a whole delivery in one request: supplier invoice, goods received
 * note and every line. The backend writes them in a single transaction, so
 * either the delivery lands or nothing does -- the three separate calls this
 * replaced could leave an invoice and a GRN behind with no stock against them.
 */
export const createGoodsReceipt = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.GOODS_RECEIPTS}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(err)
            })
    })
}

export const addIncomingItem = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_INCOMING_ITEMS}`,payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                // The whole receipt hinges on this call: reject with the error
                // so the caller can show why a line was not received.
                reject(err)
            })
    })
}

export const updateIncomingItem = (incoming_item, payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.patch(`${APP_API_URL.FETCH_INCOMING_ITEMS}`, payload, {
            params: {
                incoming_item: incoming_item
            }
        } )
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const createSupplierInvoice = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_SUPPLIER_INVOICE}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const createGRNote = (payload, auth) =>{
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve,reject) =>{
        axiosInstance.post(`${APP_API_URL.FETCH_GOODS_RECEIPT_NOTE}`, payload)
            .then((res) =>{
                resolve(res.data)
            })
            .catch((err) =>{
                reject(apiErrorMessage(err))
            })
    })
}

export const fetchLowDrugs = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.FETCH_LOW_QUANTITY}`, {
            headers: {
                Authorization: `Bearer ${auth.token}` 
            }
        })
        .then((res) => {
            resolve(res.data);
        })
        .catch((err) => {
            reject(apiErrorMessage(err));
        });
    });
};
export const fetchSupplierInvoice = (auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.FETCH_SUPPLIER_INVOICE}`, {
            headers: {
                Authorization: `Bearer ${auth.token}` 
            }
        })
        .then((res) => {
            resolve(res.data);
        })
        .catch((err) => {
            reject(apiErrorMessage(err));
        });
    });
};

export const fetchSupplierInvoicesBySupplier = (auth, supplier_id) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.FETCH_SUPPLIER_INVOICE}`, {
            params: {
                supplier: supplier_id,
            },
        })
        .then((res) => {
            resolve(res.data);
        })
        .catch((err) => {
            reject(apiErrorMessage(err));
        });
    });
};

export const fetchSupplierInvoices = (auth, params = {}) =>
    UseAxios(auth)
        .get(APP_API_URL.FETCH_SUPPLIER_INVOICE, { params })
        .then((res) => res.data);

export const fetchSupplierInvoiceDetails = (auth, id) =>
    UseAxios(auth)
        .get(APP_API_URL.SUPPLIER_INVOICE_DETAILS, { params: { id } })
        .then((res) => res.data);

export const openSupplierInvoiceReport = async (auth, params = {}) => {
    const res = await UseAxios(auth).get(APP_API_URL.SUPPLIER_INVOICE_REPORT, {
        params,
        responseType: "blob",
    });
    window.open(URL.createObjectURL(res.data), "_blank");
};

export const fetchInvoice = async (auth, supplier_id) => {
    if (!auth?.token) {
        console.error("Auth token is missing");
        throw new Error("Authentication token is required");
     }
 
     const url = `${APP_API_URL.FETCH_INVOICE}?supplier_id=${supplier_id}`;
     try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${auth.token}`,
            },
            responseType: "arraybuffer",
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching invoice:", error.response?.status, error.response?.data);
        throw error;
    }
};

export const fetchGoods = async (auth, purchase_order_id) => {
    if (!auth?.token) {
        console.error("Auth token is missing");
        throw new Error("Authentication token is required");
     }
 
     const url = `${APP_API_URL.FETCH_GOODS_RECEIPT_NOTE}?purchase_order_id=${purchase_order_id}`;
     try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${auth.token}`,
            },
            responseType: "arraybuffer",
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching receipt", error.response?.status, error.response?.data);
        throw error;
    }
};

export const allocateSupplierPayment = (auth, payload) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.post(`/api/inventory/allocate-supplier-payment`, payload)
            .then((res) => {
                resolve(res.data)
            })
            .catch((err) => {
                reject(err.response?.data || err.message)
            })
    })
};
/**
 * The stock ledger: every movement that has ever changed stock.
 *
 * Stock is not a number anyone writes to — it is the running total of these
 * rows, so this is the audit trail behind every quantity on the dashboard.
 */
export const fetchStockMovements = (auth, filters = {}) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.STOCK_MOVEMENTS}`, { params: filters })
            .then((res) => {
                resolve(res.data)
            })
            .catch((err) => {
                reject(err.response?.data || err.message)
            })
    })
};

export const fetchItemUnits = (itemId, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.get(`${APP_API_URL.ITEM_UNITS}`, { params: { item: itemId } })
            .then((res) => resolve(res.data))
            .catch((err) => reject(err))
    })
};

export const createItemUnit = (payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.post(`${APP_API_URL.ITEM_UNITS}`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err))
    })
};

export const updateItemUnit = (id, payload, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.patch(`${APP_API_URL.ITEM_UNITS}/${id}`, payload)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err))
    })
};

export const deleteItemUnit = (id, auth) => {
    const axiosInstance = UseAxios(auth);
    return new Promise((resolve, reject) => {
        axiosInstance.delete(`${APP_API_URL.ITEM_UNITS}/${id}`)
            .then((res) => resolve(res.data))
            .catch((err) => reject(err))
    })
};
