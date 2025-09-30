import { createSlice } from "@reduxjs/toolkit";
import { fetchItem, fetchItems, fetchOrderBills, fetchSuppliers, fetchInventories, fetchRequisitions,
   fetchPurchaseOrders, fetchIncomingItems, fetchAllRequisitionItems,fetchSupplierInvoice, fetchInvoice, fetchLowDrugs,
   FetchGRNote, } from "@/redux/service/inventory";


const initialState = {
  inventories: [],
  inventoryItems: [],
  requisitions: [],
  requisitionItems: [],
  purchaseOrderItems: [],
  purchaseOrders: [],
  items: [],
  suppliers: [],
  orderBills: [],
  item: [],
  incomingItems: [],
  supplierInvoice: [],
  invoice: [],
  drugs:[],
  grns:[],
};

const InventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    setItems: (state, action) => {
      state.items = action.payload;
    },
    setSuppliers: (state, action) => {
      state.suppliers = action.payload;
    },
    setOrderBills: (state, action) => {
      state.orderBills = action.payload;
    },
    setItem: (state, action) => {
      state.item = action.payload;
    },
    updateItem: (state, action) => {
      // Find the index of the item with the same id as action.payload.id
      const index = state.item.findIndex(item => parseInt(item.id) === parseInt(action.payload.id));
      
      if (index !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.item[index] = {
          ...state.item[index], // Keep existing properties
          ...action.payload       // Override with new data
        };
      }
    },
    setInventories: (state, action) => {
      state.inventories = action.payload;
    },
    setRequisitions: (state, action) => {
      state.requisitions = action.payload;
    },
    setRequisitionsAfterPoGenerate: (state, action) => {
      const requisitionIndex = state.requisitions.findIndex(
        (req) => req.id === action.payload.id
      );
      if (requisitionIndex !== -1) {
        // If requisition is found, update the existing item in the array
        state.requisitions[requisitionIndex] = {
          ...state.requisitions[requisitionIndex], // Spread existing requisition data
          ...action.payload, // Spread the updated data from the action payload
        };
      }
    },
    setRequisitionsItems: (state, action) => {
      state.requisitionItems = action.payload;
    },
    setPurchaseOrders: (state, action) => {
      state.purchaseOrders = action.payload;
    },
    setPoAfterDispatch: (state, action) => {
      const orderIndex = state.purchaseOrders.findIndex(
        (po) => po.id === action.payload.id
      );
      if (orderIndex !== -1) {
        // If po is found, update the existing item in the array
        state.purchaseOrders[orderIndex] = {
          ...state.purchaseOrders[orderIndex], // Spread existing po data
          ...action.payload, // Spread the updated data from the action payload
        };
      }
    },
    setIncoming:(state, action) => {
      state.incomingItems = action.payload;
    },
    clearInventoryItemsPdf: (state, action)=>{
      state.inventoryItems = [];
    },
    setInventoryItemsPdf: (state, action) => {
      const inventoryItem = state.inventoryItems.filter(item => item.item != action.payload.item );
      state.inventoryItems = inventoryItem;
    },
    setInventoryItems: (state, action) => {

      const inventoryItem = state.inventoryItems.find(item => item.item === action.payload.item );
      if (inventoryItem) {
        // If inventoryItem is found, update the existing item in the array
        state.inventoryItems = state.inventoryItems.map(item =>
          item.item === action.payload.item ? { ...item, preferred_supplier:action.payload.preferred_supplier, quantity_requested:action.payload.quantity_requested } : item
        );
      } else {
        // If inventoryItem is not found, add the new item to the array
        state.inventoryItems = [...state.inventoryItems, action.payload];
      }
    },

    clearPurchaseOrderItemsPdf: (state, action)=>{
      state.purchaseOrderItems = [];
    },
    setPurchaseOrderItemsPdf: (state, action) => {
      const purchaseOrderItem = state.purchaseOrderItems.filter(item => item.item != action.payload.item );
      state.purchaseOrderItems = purchaseOrderItem;
    },
    setPurchaseOrderItems: (state, action) => {

      const purchaseOrderItem = state.purchaseOrderItems.find(item => item.item === action.payload.item );
      if (purchaseOrderItem) {
        // If PurchaseOrderItem is found, update the existing item in the array
        state.purchaseOrderItems = state.purchaseOrderItems.map(item =>
          item.item === action.payload.item ? { ...item, date_created:action.payload.date_created, supplier:action.payload.supplier, quantity_purchased:action.payload.quantity_purchased } : item
        );
      } else {
        // If PurchaseOrderItem is not found, add the new item to the array
        state.purchaseOrderItems = [...state.purchaseOrderItems, action.payload];
      }
    },
    setSupplierInvoice: (state, action) => {
      state.supplierInvoice = action.payload;
    },
    setDrugs:(state, action) => {
      state.drugs = action.payload;
    },
    setInvoice: (state, action) => {
      state.invoice = action.payload;
    },
    setGoods: (state, action) => {
      state.goods = action.payload;
    }, 
    setGrns: (state, action) => {
      state.grns = action.payload;
    }
  },
});

export const { updateItem, setItems,setSuppliers,setOrderBills,setItem, setInventories, setRequisitions, 
  setPurchaseOrders, setInventoryItems, setInventoryItemsPdf, clearInventoryItemsPdf, 
  setPurchaseOrderItems, setPurchaseOrderItemsPdf, setRequisitionsAfterPoGenerate, setPoAfterDispatch,
  clearPurchaseOrderItemsPdf, setIncoming, setRequisitionsItems,setSupplierInvoice, setInvoice, setDrugs, 
  setGrns } = InventorySlice.actions;


export const getAllItems = (auth) => async (dispatch) => {
  try {
    const response = await fetchItems(auth);
    dispatch(setItems(response));
  } catch (error) {
    console.log("ITEMS_ERROR ", error);
  }
};

export const getAllInventories = (auth, department, item, processFilter, selectedSearchFilter) => async (dispatch) => {

  try {
    const response = await fetchInventories(auth, department, item, processFilter, selectedSearchFilter);
    dispatch(setInventories(response));
  } catch (error) {
    console.log("INVENTORIES_ERROR ", error);
  }
};

export const getAllRequisitions = (auth, processFilter, selectedSearchFilter) => async (dispatch) => {
  try {
    const response = await fetchRequisitions(auth, processFilter, selectedSearchFilter);
    dispatch(setRequisitions(response));
  } catch (error) {
    console.log("REQUISITIONS_ERROR ", error);
  }
};

export const getGoods = (id, auth) => async (dispatch) => {
  try {
    const response = await fetchRequisitions(auth, id);
    dispatch(setGoods(response));
  } catch (error) {
    console.log("REQUISITIONS_ERROR ", error);
  }
};

export const getAllRequisitionItems = (auth) => async (dispatch) => {
  try {
    const response = await fetchAllRequisitionItems(auth);
    dispatch(setRequisitionsItems(response));
  } catch (error) {
    console.log("REQUISITIONS_ITEMS_ERROR ", error);
  }
};

export const getAllPurchaseOrders = (auth, processFilter, selectedSearchFilter) => async (dispatch) => {
  try {
    const response = await fetchPurchaseOrders(auth, processFilter, selectedSearchFilter);
    dispatch(setPurchaseOrders(response));
  } catch (error) {
    console.log("PURCHASE_ORDERS_ERROR ", error);
  }
};

export const getAllIncomingItems = (auth, filter, processFilter, selectedSearchFilter) => async (dispatch) => {
  try {
    const response = await fetchIncomingItems(auth, filter, processFilter, selectedSearchFilter);
    dispatch(setIncoming(response));
  } catch (error) {
    console.log("INCOMING_ITEMS_RRROR ", error);
  }
};

export const getGoodRecieptNotes = (auth) => async (dispatch) => {
  try {
    const response = await FetchGRNote(auth);
    dispatch(setGrns(response));
  } catch (error) {
    console.log("GRN_ERROR ", error);
  }
}

export const getItems = (auth) => async (dispatch) => {
  try {
    const response = await fetchItem(auth);
    dispatch(setItem(response));
  } catch (error) {
    console.log("ITEMS_ERROR ", error);
  }
};

export const getAllSuppliers = (auth) => async (dispatch) => {
  try {
    const response = await fetchSuppliers(auth);
    dispatch(setSuppliers(response));
  } catch (error) {
    console.log("SUPPLIERS_ERROR ", error);
  }
};

export const getAllOrderBills = () => async (dispatch) => {
  try {
    const response = await fetchOrderBills();
    dispatch(setOrderBills(response));
  } catch (error) {
    console.log("SUPPLIERS_ERROR ", error);
  }
};

export const addItemToInventoryList = (payload) => (dispatch) => {
  dispatch(setInventoryItems(payload));
};

export const removeItemToInventoryPdf = (payload) => (dispatch) => {
  dispatch(setInventoryItemsPdf(payload));
};

export const clearItemsToInventoryPdf = () => (dispatch) => {
  dispatch(clearInventoryItemsPdf());
};

export const addItemToPurchaseOrderPdf = (payload) => (dispatch) => {
  dispatch(setPurchaseOrderItems(payload));
};

export const removeItemToPurchaseOrderPdf = (payload) => (dispatch) => {
  dispatch(setPurchaseOrderItemsPdf(payload));
};

export const clearItemsToPurchaseOrderPdf = () => (dispatch) => {
  dispatch(clearPurchaseOrderItemsPdf());
};

export const updateAnItem = (item) => (dispatch) => {
  dispatch(updateItem(item));
};

export const updateRequisitionAfterPoGenerate = (requisition) => (dispatch) => {
  dispatch(setRequisitionsAfterPoGenerate(requisition));
};
export const updatePOAfterDispatch = (po) => (dispatch) => {
  dispatch(setPoAfterDispatch(po));
};

export const getAllSupplierInvoice = (auth) => async (dispatch) => {
  try {
    console.log("Fetching supplier invoices with token:", auth?.token);
    const response = await fetchSupplierInvoice(auth);
    dispatch(setSupplierInvoice(response));
  } catch (error) {
    console.error("SUPPLIERS_ERROR:", error);
    toast.error("Failed to fetch supplier invoices");
  }
};

export const getInvoice = (supplier_id, auth) => async (dispatch) => {
  try {
    if (!auth?.token) {
      return;
  }
  const response = await fetchInvoice(auth, supplier_id);
       const fileBlob = new Blob([response], { type: "application/pdf" });
       const fileURL = window.URL.createObjectURL(fileBlob);
       dispatch(setInvoice(response));
       window.open(fileURL, "_blank");
   } catch (error) {
     console.log("INVOICE_ERROR ", error);
   }
  };

  export const getLowDrugs = (auth) => async (dispatch) => {
    try {
      const response = await fetchLowDrugs(auth);
      dispatch(setDrugs(response));
    } catch (error) {
      console.log("DRUGS_ERROR ", error);
    }
  };

export default InventorySlice.reducer;
