import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Checkbox, DialogTitle, Grid } from "@mui/material";
import { toast } from "react-toastify";
import { sendLabRequests, sendLabRequestsPanels, updateLabRequest } from "@/redux/service/laboratory";
import { useAuth } from "@/assets/hooks/use-auth";
import { getPatientTriage, getAllPatients } from "@/redux/features/patients";
import { useDispatch, useSelector } from "react-redux";
import { updateAttendanceProcesses } from "@/redux/service/patients";
import { billingInvoiceItems } from "@/redux/service/billing";
import MultiTestProfileSelector from "@/components/common/MultiTestProfileSelector";

const LabModal = ({ labOpen, setLabOpen, selectedRowData }) => {
  const { patientTriage, patients } = useSelector((store) => store.patient);
  const [loading, setLoading] = React.useState(false);
  const [testProfileSections, setTestProfileSections] = useState([]);
  const auth = useAuth();
  const dispatch = useDispatch();

  const patient = patients.find((patient)=> patient.id === selectedRowData.patient)

  const handleClose = () => {
    setLabOpen(false);
    setTestProfileSections([]);
  };

  const handleTestProfileSelectionChange = (sections) => {
    setTestProfileSections(sections);
  };



  const initialValues = {
    note: "",
    process: selectedRowData?.process_test_req,
    test_profile: null,
    requested_by: auth?.user_id,
  };

  const validationSchema = Yup.object().shape({
    // note: Yup.string().required("This field is required!"),
    // Custom validation will be handled in the component since we have dynamic test profile sections
  });

  const saveAllPanels = async (testReqPanelPayload) => {
    try {
      await sendLabRequestsPanels(testReqPanelPayload, auth).then((res)=> {
        console.log("PANELS INVOICVE ITEMS",res)
        const payload = {
          invoice: selectedRowData.invoice,
          item: parseInt(res.item)
        }
        billingInvoiceItems(auth, payload)
      })
      toast.success("Lab Request Panels saved successfully!");
    } catch (error) {
      console.log(error);
      toast.error(error);
    }
  };
  
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const savePanels = async (reqId, panels) => {
    for (const panel of panels) {
      const testReqPanelPayload = {    
        test_panel: panel.id,
        lab_test_request: reqId
      };
      await saveAllPanels(testReqPanelPayload);
      await delay(100); // Adjust the delay as needed (1000ms = 1s)
    }
  };

  const handleSendLabRequest = async (formValue, helpers) => {
    try {
      // Validate that at least one test profile is selected with panels
      const validSections = testProfileSections.filter(section => 
        section.testProfile && section.selectedPanels.length > 0
      );

      if (validSections.length === 0) {
        toast.error("Please select at least one test profile with panels");
        return;
      }

      setLoading(true);

      // Process each test profile section
      for (const section of validSections) {
        const sectionFormValue = {
          ...formValue,
          test_profile: section.testProfile
        };

        await sendLabRequests(sectionFormValue, auth).then(async (res) => {
          await savePanels(res.id, section.selectedPanels);
        });
      }

      // Update attendance process track to lab
      await updateAttendanceProcesses({track: "lab"}, selectedRowData.id, auth);
      
      helpers.resetForm();
      toast.success("All Lab Requests Sent Successfully!");
      setLoading(false);
      handleClose();
      
    } catch (err) {
      toast.error(err.message || "Error sending lab requests");
      setLoading(false);
    }
  };



  useEffect(() => {
    dispatch(getAllPatients(auth));
    dispatch(getPatientTriage(selectedRowData?.triage, auth));
  }, [selectedRowData]);

  return (
    <section>
      <Dialog
        fullWidth
        maxWidth="lg"
        open={labOpen}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          style: {
            maxHeight: '90vh',
            overflow: 'auto'
          }
        }}
      >
        <DialogTitle>
          <div className="flex justify-between">
            <p>{`Name: ${patient?.first_name} ${patient?.second_name}`}</p>
            <p>{`Gender: ${patient?.gender}`}</p>
            <p>{`Age: ${patient?.age}`}</p>            
          </div>
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSendLabRequest}
          >
            {({ values, handleChange }) => (
            <Form>
              <section className="space-y-2">
                <h1 className="">Triage Information</h1>
                <section className="flex items-center justify-between text-sm border-b bg-background p-1 rounded border-gray">
                  <div className="flex items-center gap-2">
                    <span>
                      Temperature :
                    </span>
                    <span>{patientTriage?.temperature}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Height :</span>
                    <span>{patientTriage?.height}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Weight :</span>
                    <span>{patientTriage?.weight}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Bmi :</span>
                    <span>{patientTriage?.bmi}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Pulse :</span>
                    <span>{patientTriage?.pulse}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Systolic :</span>
                    <span>{patientTriage?.systolic}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Diastolic :</span>
                    <span>{patientTriage?.diastolic}</span>
                  </div>
                </section>
                <section className="flex items-center justify-between text-sm border-b bg-background p-1 rounded border-gray">
                  <div className="flex items-center gap-2">
                    <span>Nurses Note :</span>
                    <span>{patientTriage?.notes}</span>
                  </div>
                </section>
                <Grid container spacing={2}>
                  <Grid item md={12} xs={12}>
                    <section className="space-y-3">
                      {/* Reusable Multi Test Profile Selector */}
                      <MultiTestProfileSelector 
                        onSelectionChange={handleTestProfileSelectionChange}
                        showSummary={true}
                        buttonText="Add Another Test Profile"
                      />
                      <div>
                        <Field
                          as="textarea"
                          className="block border border-gray rounded-xl py-3 px-4 focus:outline-none w-full"
                          type="text"
                          placeholder="Add a Note"
                          name="note"
                        />
                        <ErrorMessage
                          name="note"
                          component="div"
                          className="text-warning text-xs"
                        />
                      </div>
                    </section>
                  </Grid>
                </Grid>
                <div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="submit"
                      className="bg-[#02273D] px-4 py-2 text-white rounded-xl text-sm"
                    >
                      {loading && (
                        <svg
                          aria-hidden="true"
                          role="status"
                          class="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
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
                      Send All To Lab
                    </button>
                    <button
                      onClick={handleClose}
                      className="border border-warning rounded-xl px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </section>
            </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default LabModal;
