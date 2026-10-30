import React, { useEffect, useState } from "react";
import { Formik, Field, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useAuth } from "@/assets/hooks/use-auth";
import { addScheduledDrug, addScheduledLabTest } from "@/redux/features/inpatient";
import { getAllLabTestProfiles, getAllLabTestPanelsByProfile } from "@/redux/features/laboratory";
import SeachableSelect from "@/components/select/Searchable";
import { getItems } from "@/redux/features/inventory";
import { prescribeDrug } from "@/redux/service/patients";
import { fetchPrescriptionsPrescribedDrugs } from "@/redux/service/pharmacy";
import { billingInvoiceItems } from "@/redux/service/billing";
import { sendLabRequests, sendLabRequestsPanels } from "@/redux/service/laboratory";

const AddScheduleModal = ({ process, admission_id }) => {
  const [open, setOpen] = useState(false);
  const [activityType, setActivityType] = useState("drug"); 
  const [selectedPanels, setSelectedPanels] = useState([]);
  const [selectedLabProfile, setSelectedLabProfile] = useState(null);
  const dispatch = useDispatch();
  const auth = useAuth();
  const { schedules } = useSelector((store) => store.inpatient);
  const { labTestProfiles, labTestPanelsById } = useSelector((store) => store.laboratory);
  const { item } = useSelector((store) => store.inventory);


  const handleClickOpen = () => {
    setOpen(true);
    if(auth.token){
        dispatch(getItems(auth));
        dispatch(getAllLabTestProfiles(auth));
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedPanels([]);
  };

  useEffect(() => {
    if (!open) return;
    if (activityType !== "lab") return;
    if (!auth?.token) return;
    if (!selectedLabProfile?.value) return;

    dispatch(getAllLabTestPanelsByProfile(selectedLabProfile.value, auth));
    setSelectedPanels([]);
  }, [open, activityType, auth?.token, selectedLabProfile?.value, dispatch]);

  const initialValues = {
    // Medication (same as prescribe flow)
    item: null,
    dosage: "",
    frequency: "",
    duration: "",

    // Lab (same as add tests flow)
    lab_test_profile: null,

    // Shared
    schedule_time: "",
    note: "",
  };

  const validationSchema = Yup.object().shape({
    schedule_time: Yup.string().required("Time is required!"),
    item: Yup.mixed().when([], {
      is: () => activityType === "drug",
      then: (schema) => schema.required("Drug is required!"),
      otherwise: (schema) => schema.nullable(),
    }),
    dosage: Yup.string().when([], {
      is: () => activityType === "drug",
      then: (schema) => schema.required("Dosage is required!"),
      otherwise: (schema) => schema.optional(),
    }),
    frequency: Yup.string().when([], {
      is: () => activityType === "drug",
      then: (schema) => schema.required("Frequency is required!"),
      otherwise: (schema) => schema.optional(),
    }),
    duration: Yup.string().when([], {
      is: () => activityType === "drug",
      then: (schema) => schema.required("Duration is required!"),
      otherwise: (schema) => schema.optional(),
    }),
    lab_test_profile: Yup.mixed().when([], {
        is: () => activityType === "lab",
        then: (schema) => schema.required("Lab Test is required!"),
        otherwise: (schema) => schema.nullable(),
    }),
  });

  const handleCheckboxChange = (panel) => {
    setSelectedPanels((prev) => {
      const isSelected = prev.some((p) => p.id === panel.id);
      return isSelected ? prev.filter((p) => p.id !== panel.id) : [...prev, panel];
    });
  };

  const handleSelectAllPanels = () => {
    setSelectedPanels((prev) =>
      prev.length === labTestPanelsById.length ? [] : labTestPanelsById.map((p) => p)
    );
  };

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      if (!process) {
        toast.error("Missing admission process.");
        return;
      }

      if (activityType === 'drug') {
        if (!process?.prescription) {
          toast.error("No prescription found for this admission process.");
          return;
        }

        const prescribedPayload = {
          item: values.item.value,
          dosage: values.dosage,
          frequency: values.frequency,
          duration: values.duration,
          note: values.note,
          patient: process.patient,
          prescription: process.prescription,
        };

        let prescribedDrug = null;
        let createdNewPrescribedDrug = false;

        try {
          prescribedDrug = await prescribeDrug(prescribedPayload, auth);
          createdNewPrescribedDrug = true;
        } catch (e) {
          // If the drug is already on this prescription (unique constraint), reuse it and schedule.
          try {
            const existing = await fetchPrescriptionsPrescribedDrugs(process.prescription, auth);
            prescribedDrug = existing?.find(
              (d) => parseInt(d.item) === parseInt(prescribedPayload.item)
            );
          } catch (fetchErr) {
            // ignore; we'll rethrow original error below
          }

          if (!prescribedDrug) {
            throw e;
          }
        }

        // Billing item follows the existing prescribe flow, but only bill when a new prescribed drug is created.
        if (createdNewPrescribedDrug && process.invoice) {
          await billingInvoiceItems(auth, {
            item: parseInt(prescribedPayload.item),
            invoice: parseInt(process.invoice),
          });
        }

        await dispatch(
          addScheduledDrug(auth, admission_id, {
            prescribed_drug: prescribedDrug.id,
            schedule_time: values.schedule_time,
            comment: values.note || "Prescribed Drug",
          })
        );

        toast.success("Medication scheduled successfully!");
      } else {
        if (!process?.process_test_req) {
          toast.error("No lab process found for this admission process.");
          return;
        }

        if ((labTestPanelsById?.length ?? 0) > 0 && selectedPanels.length === 0) {
          toast.error("Please select at least one lab panel.");
          return;
        }

        const profileId = values.lab_test_profile.value;

        // Create LabTestRequest (same as Add tests flow)
        const labReq = await sendLabRequests(
          {
            process: process.process_test_req,
            test_profile: profileId,
            note: values.note,
            requested_by: auth?.user_id,
          },
          auth
        );

        // Create panels + bill each panel (same as Add tests flow)
        for (const panel of selectedPanels) {
          const res = await sendLabRequestsPanels(
            {
              test_panel: panel.id,
              lab_test_request: labReq.id,
            },
            auth
          );

          if (process.invoice && res?.item) {
            await billingInvoiceItems(auth, {
              invoice: process.invoice,
              item: parseInt(res.item),
            });
          }
        }

        // Finally, create the scheduled occurrence (time factor)
        await dispatch(
          addScheduledLabTest(auth, admission_id, {
            lab_test_request: labReq.id,
            lab_test_profile: profileId,
            schedule_time: values.schedule_time,
            note: values.note,
          })
        );

        toast.success("Lab test scheduled successfully!");
      }

      resetForm();
      setSubmitting(false);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to add schedule.");
      setSubmitting(false);
    }
  };

  return (
    <section>
      <button
        className="bg-primary text-white px-4 py-2 rounded"
        onClick={handleClickOpen}
      >
        Add Schedule
      </button>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Add Schedule</DialogTitle>
        <DialogContent>
            <div className="flex gap-4 my-4 mb-6 border-b pb-2">
                <button 
                  onClick={() => setActivityType("drug")}
                  className={`px-4 py-2 rounded ${activityType === 'drug' ? 'bg-primary text-white' : 'bg-gray-200'}`}
                >
                    Medication
                </button>
                <button 
                  onClick={() => setActivityType("lab")}
                  className={`px-4 py-2 rounded ${activityType === 'lab' ? 'bg-primary text-white' : 'bg-gray-200'}`}
                >
                    Lab Test
                </button>
            </div>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue }) => (
              <Form className="w-full">
                <div className="grid grid-cols-1 gap-4 my-2">
                  
                  {activityType === 'drug' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Drug Item
                    </label>
                    <SeachableSelect
                        name="item"
                        label="Select Drug"
                        options={item
                          .filter((i) => i.category === "Drug")
                          .map((i) => ({ value: i.id, label: i.name }))}
                    />
                    <ErrorMessage
                      name="item"
                      component="div"
                      className="text-red-500 text-xs"
                    />
                  </div>
                  )}

                  {activityType === 'drug' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Dosage</label>
                        <Field name="dosage" className="w-full p-2 border rounded" />
                        <ErrorMessage name="dosage" component="div" className="text-red-500 text-xs" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Frequency</label>
                        <Field name="frequency" className="w-full p-2 border rounded" />
                        <ErrorMessage name="frequency" component="div" className="text-red-500 text-xs" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Duration</label>
                        <Field name="duration" className="w-full p-2 border rounded" />
                        <ErrorMessage name="duration" component="div" className="text-red-500 text-xs" />
                      </div>
                    </>
                  )}

                  {activityType === 'lab' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Lab Test Profile
                    </label>
                    <SeachableSelect
                        name="lab_test_profile"
                        label="Select Test"
                        options={labTestProfiles.map((test) => ({ value: test.id, label: test.name }))}
                      setSelectedItem={setSelectedLabProfile}
                    />
                    <ErrorMessage
                      name="lab_test_profile"
                      component="div"
                      className="text-red-500 text-xs"
                    />
                  </div>
                  )}

                  {activityType === 'lab' && values.lab_test_profile?.value && (
                    <div>
                      <button
                        type="button"
                        className="text-sm underline"
                        onClick={() => {
                          dispatch(getAllLabTestPanelsByProfile(values.lab_test_profile.value, auth));
                          setSelectedPanels([]);
                        }}
                      >
                        Load / Refresh Panels
                      </button>

                      {labTestPanelsById?.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedPanels.length === labTestPanelsById.length}
                              onChange={handleSelectAllPanels}
                            />
                            <span className="text-sm">Select all</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {labTestPanelsById.map((panel) => (
                              <label key={panel.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={selectedPanels.some((p) => p.id === panel.id)}
                                  onChange={() => handleCheckboxChange(panel)}
                                />
                                <span>{panel.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Schedule Time
                    </label>
                    <Field
                      name="schedule_time"
                      type="datetime-local"
                      className="w-full p-2 border rounded"
                    />
                    <ErrorMessage
                      name="schedule_time"
                      component="div"
                      className="text-red-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Note
                    </label>
                    <Field
                      as="textarea"
                      name="note"
                      className="w-full p-2 border rounded"
                      rows="3"
                    />
                    <ErrorMessage
                      name="note"
                      component="div"
                      className="text-red-500 text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    type="submit"
                    className="bg-primary text-white px-4 py-2 rounded"
                  >
                    Save
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AddScheduleModal;
