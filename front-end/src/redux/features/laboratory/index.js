import { createSlice } from "@reduxjs/toolkit";
import { fetchLabRequests, 
    fetchLabResults,fetchLabEquipment, 
    fetchLabTestProfile, fetchLabTestPanels, 
    fetchPublicLabRequests, fetchSpecificPatientLabRequests,
    fetchLabTestPanelsByProfileId,
    fetchLabTestPanelsByTestRequestId,
    fetchQualitativeLabRequests,
    fetchResultPanelsByResultsId,
    fetchQualitativeResultPanelsByResultsId,
    fetchLabTestByProcessId,
    fetchSamplesForSpecificProcess,
    fetchPhlebotomySamples,
    fetchLabTestPanelsBySpecificSample, fetchSpecimens, fetchReferenceValues,
  } from "@/redux/service/laboratory";


const initialState = {
  labResults: [],
  resultPanels: [],
  qualitativeLabResults: [],
  labResultItems: [],
  labTestPanels: [],
  labTestPanelsById: [],
  labRequests: [],
  phlebotomySamples: [],
  labRequestsByProcess: [],
  labSamplesByProcess: [],
  publicLabRequests: [],
  labEquipments: [],
  labTestProfiles: [],
  patientSpecificLabRequests: [],
  processAllTestRequest: [],
  specimens: [],
  referenceValues: []
};

const LaboratorySlice = createSlice({
  name: "laboratory",
  initialState,
  reducers: {
    setLabResults: (state, action) => {
      state.labResults = action.payload;
    },
    setQualitativeLabResults: (state, action) => {
      state.qualitativeLabResults = action.payload;
    },
    setLabRequests: (state, action) => {
      state.labRequests = action.payload;
    },
    updateAddedLabRequestToStore: (state, action) => {
      state.labRequests = [action.payload, ...state.labRequests];
    },    
    setPhlebotomySamples: (state, action) => {
      state.phlebotomySamples = action.payload;
    },
    setSpecimens: (state, action) => {
      state.specimens = action.payload;
    },
    setReferenceValues: (state, action) => {
      state.referenceValues = action.payload;
    },
    addSpecimenToStoreOnCreate: (state, action) => {
      state.specimens = [action.payload, ...state.specimens];
    },
    updateSpecimenToStoreOnPatch: (state, action) => {

      // Find the index of the item with the same id as action.payload.id
      const index = state.specimens.findIndex(specimen => parseInt(specimen.id) === parseInt(action.payload.id));

      if (index !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.specimens[index] = {
          ...state.specimens[index], // Keep existing properties
          ...action.payload       // Override with new data
        };
      }
    },
    addReferenceValueToStoreOnCreate: (state, action) => {
      state.referenceValues = [action.payload, ...state.referenceValues];
    },
    updateReferenceValueToStoreOnPatch: (state, action) => {
      const index = state.referenceValues.findIndex(
        (value) => parseInt(value.id) === parseInt(action.payload.id)
      );

      if (index !== -1) {
        state.referenceValues[index] = {
          ...state.referenceValues[index],
          ...action.payload,
        };
      }
    },
    setProcessLabRequests: (state, action) => {
      state.labRequestsByProcess = action.payload;
    },
    clearProcessLabRequests: (state, action)=>{
      state.labRequestsByProcess = [];
    },
    setProcessesSamples: (state, action) => {
      state.labSamplesByProcess = action.payload;
    },
    clearProcessesSamples: (state, action)=>{
      state.labSamplesByProcess = [];
    },
    setPublicLabRequests: (state, action) => {
      state.publicLabRequests = action.payload;
    },
    setSpecificPatientLabRequests: (state, action) => {
      state.patientSpecificLabRequests = action.payload
    },
    setLabEquipments: (state, action) => {
      state.labEquipments = action.payload;
    },
    createLabEquipmentStore: (state, action) => {
      state.labEquipments = [action.payload, ...state.labEquipments];
    },
    updateLabEquipmentStore: (state, action) => {
      // Find the index of the item with the same id as action.payload.id
      const index = state.labEquipments.findIndex(equipment => parseInt(equipment.id) === parseInt(action.payload.id));

      if (index !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.labEquipments[index] = {
          ...state.labEquipments[index], // Keep existing properties
          ...action.payload       // Override with new data
        };
      }
    },
    setLabTestProfile: (state, action) => {
      state.labTestProfiles = action.payload;
    },
    addProfileToStoreOnCreate: (state, action) => {
      state.labTestProfiles = [action.payload, ...state.labTestProfiles];
    },
    updateProfileToStoreOnPatch: (state, action) => {
      // Find the index of the item with the same id as action.payload.id
      const index = state.labTestProfiles.findIndex(profile => parseInt(profile.id) === parseInt(action.payload.id));

      if (index !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.labTestProfiles[index] = {
          ...state.labTestProfiles[index], // Keep existing properties
          ...action.payload       // Override with new data
        };
      }
    },
    setLabTestPanels: (state, action) => {
      state.labTestPanels = action.payload;
    },
    newTestPanelsStore: (state, action) => {
      state.labTestPanels = [action.payload, ...state.labTestPanels];
    },
    updatePanelsOnPatch: (state, action) => {
      // Find the index of the item with the same id as action.payload.id
      const index = state.labTestPanels.findIndex(panels => parseInt(panels.id) === parseInt(action.payload.id));

      if (index !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.labTestPanels[index] = {
          ...state.labTestPanels[index], // Keep existing properties
          ...action.payload       // Override with new data
        };
      }
    },
    setLabTestPanelsById: (state, action) => {
      state.labTestPanelsById = action.payload;
    },
    setResultPanelsByResultId: (state, action) => {
      state.resultPanels = action.payload;
    },
    clearLabResultItems: (state, action)=>{
      state.labResultItems = [];
    },
    setLabResultItemsAfterRemovingItem: (state, action) => {
      const labResultItem = state.labResultItems.filter(item => item.test_panel != action.payload.test_panel );
      state.labResultItems = labResultItem;
    },
    setLabResultItems: (state, action) => {

      const labResultItem = state.labResultItems.find(item => item.test_panel === action.payload.test_panel );
      if (labResultItem) {
        // If labResultItem is found, update the existing item in the array
        state.labResultItems = state.labResultItems.map(item =>
          item.test_panel === action.payload.test_panel ? { ...item, result:action.payload.result, lab_test_result:action.payload.lab_test_result } : item
        );
      } else {
        // If labResultItem is not found, add the new item to the array
        state.labResultItems = [...state.labResultItems, action.payload];
      }
    },
    updateLabResultItems: (state, action) => {
      const labResultItemIndex = state.labResultItems.findIndex(item => item.test_panel === action.payload.test_panel );
      if (labResultItemIndex !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.labResultItems[labResultItemIndex] = {
          ...state.labResultItems[labResultItemIndex], // Keep existing properties
          ...action.payload// Override with new data
        };
      }
    },
    setProcessAllTestRequest: (state, action) => {
      state.processAllTestRequest = [...state.processAllTestRequest, action.payload]
    },
    clearProcessAllTestRequest: (state, action) => {
      state.processAllTestRequest = []
    }
  },
});

export const { setLabResults, 
  setLabRequests, setPublicLabRequests, 
  setLabEquipments,setLabTestProfile, setSpecificPatientLabRequests,
  setLabResultItems, setLabResultItemsAfterRemovingItem, setResultPanelsByResultId,
  clearLabResultItems, setLabTestPanels, setLabTestPanelsById, setQualitativeLabResults,
  setProcessLabRequests, clearProcessLabRequests, setProcessAllTestRequest,
  clearProcessAllTestRequest, setProcessesSamples, clearProcessesSamples,
  setPhlebotomySamples, updateLabEquipmentStore, createLabEquipmentStore, setSpecimens, newTestPanelsStore,
  updatePanelsOnPatch, addSpecimenToStoreOnCreate, updateSpecimenToStoreOnPatch,
  updateProfileToStoreOnPatch, addProfileToStoreOnCreate, updateLabResultItems, updateAddedLabRequestToStore,
  setReferenceValues, addReferenceValueToStoreOnCreate, updateReferenceValueToStoreOnPatch
} = LaboratorySlice.actions;


export const getAllLabResults = (auth) => async (dispatch) => {
  try {
    const response = await fetchLabResults(auth);
    dispatch(setLabResults(response));
  } catch (error) {
    console.log("LAB_ERROR ", error);
  }
};

export const getAllQualitativeLabResults = (auth) => async (dispatch) => {
  try {
    const response = await fetchQualitativeLabRequests(auth);
    dispatch(setQualitativeLabResults(response));
  } catch (error) {
    console.log("QUALITATIVE_RESULTS_LAB_ERROR ", error);
  }
};

export const getAllLabEquipments = (auth) => async (dispatch) => {
  try {
    const response = await fetchLabEquipment(auth);
    dispatch(setLabEquipments(response));
  } catch (error) {
    console.log("LAB_ERROR ", error);
  }
};

export const getAllLabRequests = (auth, process_id) => async (dispatch) => {
  try {
    const response = await fetchLabRequests(auth, process_id);
    dispatch(setLabRequests(response));
  } catch (error) {
    console.log("LAB_ERROR ", error);
  }
};

export const updateInpatientLabTestsStore = (payload) => (dispatch) => {
  dispatch(updateAddedLabRequestToStore(payload));
};

export const getAllPhlebotomySamples = (auth) => async (dispatch) => {
  try {
    const response = await fetchPhlebotomySamples(auth);
    dispatch(setPhlebotomySamples(response));
  } catch (error) {
    console.log("PHLEBOTOMY SAMPLES ", error);
  }
};

export const getAllSpecificPatientLabRequsts = (patient_id, auth) => async (dispatch) => {
  try {
    const response = await fetchSpecificPatientLabRequests(patient_id, auth);
    dispatch(setSpecificPatientLabRequests(response));

  }catch (error){
    console.log("Specific Patient Lab Requests", error)
  }
}

export const getAllPublicLabRequests = (auth) => async (dispatch) => {
  try {
    const response = await fetchPublicLabRequests(auth);
    dispatch(setPublicLabRequests(response));
  } catch (error) {
    console.log("PUBLIC_LAB_REQ_ERROR ", error);
  }
};

export const getAllLabTestProfiles = (auth) => async (dispatch) => {
  try {
    const response = await fetchLabTestProfile(auth);
    dispatch(setLabTestProfile(response));
  } catch (error) {
    console.log("LAB_ERROR ", error);
  }
};

export const getAllLabTestPanels = (auth) => async (dispatch) => {
  try {
    const response = await fetchLabTestPanels(auth);
    dispatch(setLabTestPanels(response));
  } catch (error) {
    console.log("LAB_TSEST_PANELS_ERROR ", error);
  }
};

export const getAllLabTestPanelsByProfile = (profile_id, auth) => async (dispatch) => {
  try {
    const response = await fetchLabTestPanelsByProfileId(profile_id, auth);
    dispatch(setLabTestPanelsById(response));
  } catch (error) {
    console.log("LAB_TEST_PANELS_BY_PROFILE_ID_ERROR ", error);
  }
};

export const getAllResultPanelsByResult = (result_id, auth) => async (dispatch) => {
  try {
    const response = await fetchResultPanelsByResultsId(result_id, auth);
    dispatch(setResultPanelsByResultId(response));
  } catch (error) {
    console.log("LAB_RESULT_PANELS_BY_RESULT_ID_ERROR ", error);
  }
};

export const getAllQualitativeResultPanelsByResult = (result_id, auth) => async (dispatch) => {
  try {
    const response = await fetchQualitativeResultPanelsByResultsId(result_id, auth);
    dispatch(setResultPanelsByResultId(response));
  } catch (error) {
    console.log("LAB_RESULT_PANELS_BY_RESULT_ID_ERROR ", error);
  }
};

export const getAllLabTestPanelsByTestRequest = (test_request_id, auth) => async (dispatch) => {
  try {
    const response = await fetchLabTestPanelsByTestRequestId(test_request_id, auth);
    dispatch(clearItemsToLabResultsItems())
    response.forEach((item)=> {
      dispatch(addItemToLabResultsItems(item));
    })
  } catch (error) {
    console.log("LAB_TEST_PANELS_BY_PROFILE_ID_ERROR ", error);
  }
};

export const getAllLabTestPanelsBySample = (sample_id, auth) => async (dispatch) => {
  try {
    const response = await fetchLabTestPanelsBySpecificSample(sample_id, auth);
    dispatch(clearItemsToLabResultsItems())
    response.forEach((item)=> {
      dispatch(addItemToLabResultsItems(item));
    })
  } catch (error) {
    console.log("LAB_TEST_PANELS_BY_PROFILE_ID_ERROR ", error);
  }
};

export const getAllLabTestByProcessId = (process_id, auth) => async (dispatch) => {
  try {
    const response = await fetchLabTestByProcessId(process_id, auth);
    dispatch(clearProcessLabRequests())
      dispatch(setProcessLabRequests(response));

  } catch (error) {
    console.log("LAB_TEST_REQ_BY_PROCESS_ID_ERROR ", error);
  }
};

export const getAllSamplesForProcessId = (process_id, auth) => async (dispatch) => {
  try {
    const response = await fetchSamplesForSpecificProcess(process_id, auth);
    dispatch(clearProcessesSamples())
    dispatch(setProcessesSamples(response));

  } catch (error) {
    console.log("SAMPLES_BY_PROCESS_ID_ERROR ", error);
  }
};

export const getSpecimens = (auth) => async (dispatch) => {
  try {
    const response = await fetchSpecimens(auth);
    dispatch(setSpecimens(response));
  } catch (error) {
    console.log("SPECIMENS_ERROR ", error);
  }
};

export const getReferenceValues = (auth) => async (dispatch) => {
  try {
    const response = await fetchReferenceValues(auth);
    dispatch(setReferenceValues(response));
  } catch (error) {
    console.log("REFERENCE_VALUES_ERROR ", error);
  }
};

export const addItemToLabResultsItems = (payload) => (dispatch) => {
  dispatch(setLabResultItems(payload));
};

export const updateItemToLabResultsItems = (payload) => (dispatch) => {
  dispatch(updateLabResultItems(payload));
};

export const removeItemToLabResultsItems = (payload) => (dispatch) => {
  dispatch(setLabResultItemsAfterRemovingItem(payload));
};

export const clearItemsToLabResultsItems = () => (dispatch) => {
  dispatch(clearLabResultItems());
};

export const createALabEquipmentStore = (payload) => (dispatch) => {
  dispatch(createLabEquipmentStore(payload));
};

export const updateALabEquipmentStore = (payload) => (dispatch) => {
  dispatch(updateLabEquipmentStore(payload));
};

export const updateTestPanelsStore = (payload) => (dispatch) => {
  dispatch(newTestPanelsStore(payload));
}

export const updateTestPanelStoreOnPatch = (payload) => (dispatch) => {
  dispatch(updatePanelsOnPatch(payload));
};
export const addSpecimenToStore = (payload) => (dispatch) => {
  dispatch(addSpecimenToStoreOnCreate(payload));
};

export const updateSpecimenToStore = (payload) => (dispatch) => {
  dispatch(updateSpecimenToStoreOnPatch(payload));
};

export const addReferenceValueToStore = (payload) => (dispatch) => {
  dispatch(addReferenceValueToStoreOnCreate(payload));
};

export const updateReferenceValueToStore = (payload) => (dispatch) => {
  dispatch(updateReferenceValueToStoreOnPatch(payload));
};

export const addProfileToStore = (payload) => (dispatch) => {
  dispatch(addProfileToStoreOnCreate(payload));
};

export const updateProfileToStore = (payload) => (dispatch) => {
  dispatch(updateProfileToStoreOnPatch(payload));
};


export default LaboratorySlice.reducer;
