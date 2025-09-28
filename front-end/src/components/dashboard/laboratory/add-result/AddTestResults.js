import React, { useState, useEffect } from 'react';
import { toast } from "react-toastify";
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Grid } from '@mui/material';
import dynamic from "next/dynamic";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Column, Pager, Editing } from "devextreme-react/data-grid";
import CmtDropdownMenu from '@/assets/DropdownMenu';
import { LuMoreHorizontal } from 'react-icons/lu';
import { SlMinus } from 'react-icons/sl';

import { useAuth } from '@/assets/hooks/use-auth';
// Removed unused imports - using inline editing instead

import { removeItemToLabResultsItems, getAllLabRequests, getAllPhlebotomySamples, getAllLabTestPanelsBySample, updateItemToLabResultsItems, getAllLabTestPanels } from '@/redux/features/laboratory';
import SeachableSelect from '@/components/select/Searchable';
import { updateLabRequestPanels, updateLabRequestPanelResult } from '@/redux/service/laboratory';

const DataGrid = dynamic(() => import("devextreme-react/data-grid"), {
  ssr: false,
});

const getActions = () => {
  let actions = [
    {
      action: "remove",
      label: "Remove",
      icon: <SlMinus className="text-success text-xl mx-2" />,
    },
    {
      action: "add-result",
      label: "Add Results",
      icon: <SlMinus className="text-success text-xl mx-2" />,
    },
  ];
  
  return actions;
};

const AddTestResults = () => {

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selected, setSelectedItem] = useState(null);
  const [savingResults, setSavingResults] = useState(new Set()); // Track which results are being saved
  const dispatch = useDispatch();
  const { labResultItems  } = useSelector((store) => store.laboratory);
  const { labTestPanels  } = useSelector((store) => store.laboratory);
  const auth = useAuth();

  // Inline editing with auto-save - no modal needed
  const { phlebotomySamples } = useSelector((store) => store.laboratory);

  const token = useAuth();
  const initialValues = {
    title: "",
    lab_test_request: null,
    recorded_by:token.user_id,
  };

  useEffect(() => {
    if (token) {
      dispatch(getAllLabRequests(token));
      dispatch(getAllLabTestPanels(auth))
      dispatch(getAllPhlebotomySamples(token))
      if(selected){
        console.log("Fetching lab test panels for sample:", selected.label);
        dispatch(getAllLabTestPanelsBySample(selected.label, token));
      }
    }
  }, [token, selected]);
  
  // Debug logging for labResultItems
  useEffect(() => {
    console.log("=== LAB RESULT ITEMS DEBUG ===");
    console.log("Total labResultItems:", labResultItems.length);
    console.log("labResultItems data:", labResultItems);
    
    if (labResultItems.length > 0) {
      console.log("First item structure:", labResultItems[0]);
      console.log("First item keys:", Object.keys(labResultItems[0]));
      console.log("is_billed values:", labResultItems.map(item => ({ id: item.id, is_billed: item.is_billed, test_panel_name: item.test_panel_name })));
    } else {
      console.log("No labResultItems found - check if sample selection is working");
    }
  }, [labResultItems]);
  
  const validationSchema = Yup.object().shape({
    lab_test_request: Yup.object().required("This field is required!"),
  });

  // Removed menu actions - using inline editing instead

  const saveLabResults = async (formValue, helpers) => {
    console.log("Complete & Return clicked:", formValue)

    try {
      // Check if there are any results entered (results are auto-saved, so we just check for completion)
      const resultsWithData = labResultItems.filter(panel => 
        panel.result && panel.result.toString().trim() !== ''
      );
      
      if (resultsWithData.length <= 0) {
        toast.error("No results have been entered");
        return;
      }    
      
      setLoading(true);
      
      // Since we're using auto-save, results are already saved
      // Just show success message and navigate back
      toast.success("Results completed successfully!");
      setLoading(false);
      router.back();

    } catch(error) {
      console.error("Error completing results:", error);
      toast.error("Error completing results. Please try again.");
      setLoading(false);
    }
  }

  const updateRow = async (e) => {
    console.log("ROW UPDATED TO", e);
    e.cancel = true;
  
    // Create a new object with updated data
    const updatedData = { ...e.oldData, result: e.newData.result };
    
    // Add to saving set
    setSavingResults(prev => new Set([...prev, updatedData.id]));
    
    try {
      // Auto-save the result to backend
      const payload = {
        result: updatedData.result,
        test_panel: updatedData.test_panel,
        lab_test_request: updatedData.lab_test_request
      };
      
      console.log("Auto-saving result for panel ID:", updatedData.id, "with payload:", payload);
      console.log("Full updatedData object:", JSON.stringify(updatedData, null, 2));
      
      // Use the correct PUT API with panel ID in URL
      const response = await updateLabRequestPanelResult(updatedData.id, payload, auth);
      
      // Update local state with the response from backend
      dispatch(updateItemToLabResultsItems(response));
      
      toast.success(`Result saved!`, { 
        position: "bottom-right",
        autoClose: 2000,
        hideProgressBar: true
      });
      
    } catch (error) {
      console.error("Error auto-saving result:", error);
      toast.error("Failed to save result. Please try again.");
      
      // Don't update local state if save failed
      return;
    } finally {
      // Remove from saving set
      setSavingResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(updatedData.id);
        return newSet;
      });
    }
  };
  return (
    <section>
      <div className="flex gap-4 mb-8 items-center">
          <img onClick={() => router.back()} className="h-3 w-3 cursor-pointer" src="/images/svgs/back_arrow.svg" alt="go back"/>
          <h3 className="text-xl"> Lab Result entry </h3>
      </div>
      <div className='flex justify-between items-center mb-4'>
        <div className="text-sm text-gray-600">
          💡 <strong>Tip:</strong> Click on any result cell to enter values. Results auto-save when you click outside the cell.
        </div>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={saveLabResults}
      >
        {({ values, setFieldValue }) => (
      <Form className="">
      <Grid container spacing={2} className='my-2 flex items-center'>
        <Grid item md={12} xs={12}>
          <SeachableSelect
            label="Sample"
            name="lab_test_request"
            setSelectedItem={(selectedOption) => {
              setSelectedItem(selectedOption);
            }}
            options={phlebotomySamples.filter((sample)=>sample.is_sample_collected === true).map((labRequests) => ({ value: labRequests.id, label: `${labRequests?.patient_sample_code}` }))}
          />
          <ErrorMessage
            name="lab_test_request"
            component="div"
            className="text-warning text-xs"
          />  
        </Grid>
      </Grid>
      <DataGrid
        dataSource={labResultItems}
        allowColumnReordering={true}
        rowAlternationEnabled={true}
        showBorders={true}
        remoteOperations={true}
        showColumnLines={true}
        showRowLines={true}
        wordWrapEnabled={true}
        allowPaging={true}
        className="shadow-xl"
        onRowUpdating={updateRow}
      >
        <Editing
          mode="cell"
          allowUpdating={true}
        />
        <Pager
          visible={false}
          showPageSizeSelector={true}
          showNavigationButtons={true}
        />
        <Column 
          dataField="test_panel"
          caption="Test Panel" 
          cellRender={(cellData) => {
            const testPanel = labTestPanels.find(item => item.id === cellData.data.test_panel);
            return testPanel ? `${testPanel.name}` : 'Loading...';
          }}
          allowEditing={false}
        />
        <Column 
          dataField="result" 
          caption="Result (Click to edit)" 
          allowEditing={true}
          cellRender={(cellData) => {
            const hasResult = cellData.value && cellData.value.toString().trim() !== '';
            const isSaving = savingResults.has(cellData.data.id);
            
            return (
              <div className="flex items-center gap-2">
                <div className={hasResult ? "text-blue-600 font-medium" : "text-gray-400 italic"}>
                  {hasResult ? cellData.value : "Click to add result"}
                </div>
                {isSaving && (
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                )}
              </div>
            );
          }}
        />
        <Column 
          dataField="is_quantitative" 
          caption="Type"
          allowEditing={false}
          cellRender={(cellData) => {
            return cellData.data.is_quantitative ? "Quantitative" : "Qualitative";
          }}
        />
      </DataGrid>
      <Grid className='py-2' item md={4} xs={12}>
          <Field
            as='textarea'
            rows={4}
            className="block border rounded-lg text-sm border-gray py-2 px-4 focus:outline-card w-full"
            maxWidth="sm"
            placeholder="Comments"
            name="title"
          />
          <ErrorMessage
            name="title"
            component="div"
            className="text-warning text-xs"
          />
        </Grid>
      <Grid item md={12} xs={12}>
        <div className="flex py-2 items-center justify-end">
          <button
            type="submit"
            className="bg-primary rounded-xl text-sm px-8 py-4 text-white"
          >
            {loading && (
              <svg
                aria-hidden="true"
                role="status"
                className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                ></path>
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="#1C64F2"
                ></path>
              </svg>
            )}
            Complete & Return
          </button>
        </div>
      </Grid>

      </Form>)}
      </Formik>
    </section>
  )
}

export default AddTestResults