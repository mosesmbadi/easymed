import React, { useEffect, useState } from "react";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { DialogTitle, Grid } from "@mui/material";
import * as Yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { addItemToLabResultsItems, getAllLabTestPanels } from "@/redux/features/laboratory";
import { toast } from "react-toastify";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import SeachableSelect from "@/components/select/Searchable";
import { useAuth } from "@/assets/hooks/use-auth";
import { updateLabRequestPanelResult } from "@/redux/service/laboratory";

const AddResultItemModal = ({open, setOpen, selected, sample_label}) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth();
  const { labTestPanels  } = useSelector((store) => store.laboratory);
  const selectedPanel = labTestPanels.find((panel)=> panel.id ===selected?.test_panel)
  
  // Debug logging
  console.log("LabItemModal selected object:", selected);
  console.log("Selected ID:", selected?.id);
  console.log("Selected keys:", selected ? Object.keys(selected) : 'no selected object');
  
  const handleClose = () => {
    setOpen(false);
  };

  const initialValues = {
    result: selected?.result || '',
    test_panel: selectedPanel ? {value:selectedPanel.id, label: selectedPanel.name} : "",
    lab_test_request: selected?.lab_test_request || 0
  };

  const validationSchema = Yup.object().shape({
    test_panel: Yup.object().required("This field is required!"),
    result: Yup.string().required("This field is required!"),
  });

  const handleAddLabResultItem = async (formValue, helpers) => {
    console.log("Form values:", formValue);
    console.log("Selected panel data:", selected);
    console.log("Selected ID:", selected?.id);
    console.log("Selected object keys:", selected ? Object.keys(selected) : 'no selected object');

    try {
      // Check if we have the panel ID
      if (!selected?.id) {
        console.log("ERROR: No panel ID found. Selected object structure:", JSON.stringify(selected, null, 2));
        toast.error("Panel ID is required to save the result");
        return;
      }

      const payload = {
        result: formValue.result,
        test_panel: formValue.test_panel.value,
        lab_test_request: selected.lab_test_request || formValue.lab_test_request
      };

      console.log("Payload being sent:", payload);
      console.log("Panel ID being used:", selected.id);

      setLoading(true);
      
      // Save to backend using PUT request with panel ID in URL
      const response = await updateLabRequestPanelResult(selected.id, payload, auth);
      
      // Update Redux store with the saved data
      dispatch(addItemToLabResultsItems(response));
      
      toast.success("Lab result saved successfully!");
      setLoading(false);
      handleClose();

    } catch (err) {
      console.error("Error saving lab result:", err);
      toast.error(err.message || "Error saving lab result");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth){
      dispatch(getAllLabTestPanels(auth))
    }
    
  }, [auth]);

  return (
    <section>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle>
          <p className="text-sm font-semibold">{`sample: ${sample_label}`}</p>
        </DialogTitle>
        <DialogContent>
          <h3 className="text-xl my-4"> Add Lab Result Panel </h3>
        <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleAddLabResultItem}
      >
        <Form className="">
          <Grid container spacing={4}>
            <Grid className='my-2' item md={12} xs={12}>
              <SeachableSelect
                label="Select Test Panel"
                name="test_panel"
                options={labTestPanels.map((labTestPanel) => ({ ref_value:labTestPanel.ref_value, value: labTestPanel.id, label: `${labTestPanel?.name}` }))}
              />
              <ErrorMessage
                name="test_panel"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>
            <Grid item md={12} xs={12}>
            <Field
              as={selected?.is_qualitative ? 'textarea' : 'input'}
              className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
              maxWidth="sm"
              type={selected?.is_qualitative ? 'text' : 'number'}
              placeholder="Result"
              name="result"
              rows={selected?.is_qualitative ? 6 : undefined}
            />
              <ErrorMessage
                name="result"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>
            <Grid item md={12} xs={12}>
              <div className="flex items-center justify-end">
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
                  Save Result
                </button>
              </div>
            </Grid>
          </Grid>
        </Form>
      </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AddResultItemModal;
