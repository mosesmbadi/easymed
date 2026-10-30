import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Form, ErrorMessage } from "formik";
import { DialogTitle, Grid } from "@mui/material";
import { toast } from "react-toastify";
import { getAllDoctors } from "@/redux/features/doctors";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import SeachableSelect from "@/components/select/Searchable";
import { updateAttendanceProcesses } from "@/redux/service/patients";
import { getAllProcesses } from "@/redux/features/patients";
import { getItems } from "@/redux/features/inventory";
import { billingInvoiceItems } from "@/redux/service/billing";


export default function AssignDoctorModal({
  assignOpen,
  setAssignOpen,
  selectedData,
}) {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth();
  const { doctors } = useSelector((store) => store.doctor);
  const { item, } = useSelector(({ inventory }) => inventory);

  const authUser = useAuth();

  const handleClose = () => {
    setAssignOpen(false);
  };

  useEffect(() => {
    if (authUser) {
      dispatch(getAllDoctors(authUser)); 
      dispatch(getItems(authUser))
    }
  }, [authUser]);

  const initialValues = {
    doctor: null,
    item: null,
  };

  const validationSchema = Yup.object().shape({
    doctor: Yup.object().required("Select a doctor!"),
    item: Yup.object().required("Select an item!"),
  });

  const saveInvoiceItem = async (invoice, item)=> {
    const payload = {
      invoice: invoice,
      item:parseInt(item),
    }
    try{
      billingInvoiceItems(auth, payload);
    }catch(error){
      console.log("FAILED SAVING ITEM",  error)
    }
  }

  const handleAssignDoctor = async (formValue, helpers) => {
    try {   
      setLoading(true);
      const formData = {
        ...formValue,
        doctor: parseInt(formValue.doctor.value),
        track: "triage"
      };
      await updateAttendanceProcesses(formData, selectedData?.id, auth).then(() => {
        helpers.resetForm();
        saveInvoiceItem(selectedData.invoice, parseInt(formValue.item.value))
        dispatch(getAllProcesses(authUser))
        toast.success("Doctor Assigned, proceed to Billing!");
        setLoading(false);
        handleClose();
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  return (
    <div>
      <Dialog
        open={assignOpen}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle>
        <p className="text-sm font-semibold">{`send ${selectedData?.patient_name} for Triage`}</p>
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleAssignDoctor}
          >
            <Form className="py-4">
            <section className="space-y-1">
              <Grid container spacing={2}>
              <Grid item md={12} xs={12}>
                <SeachableSelect
                  label="Select Appointment"
                  name="item"
                  options={item.filter((drug)=> (drug.category === "Specialized Appointment") || (drug.category === "General Appointment") || (drug.category === "General")).map((item) => ({ value: item.id, label: `${item?.name}` }))}
                />
                <ErrorMessage
                  name="item"
                  component="div"
                  className="text-warning text-xs"
                />
              </Grid>
              <Grid item md={12} xs={12}>
              <SeachableSelect
                label="Assign A Doctor"
                name="doctor"
                options={doctors.map((item) => ({ value: item.id, label: `${item?.first_name} ${item?.last_name}` }))}
              />
              <ErrorMessage
                name="doctor"
                component="div"
                className="text-warning text-xs"
              />
              </Grid>
                <Grid item md={12} xs={12}>
                  <div className="flex items-center gap-2 justify-end mt-3">
                    <button
                      type="submit"
                      className="bg-primary px-3 py-2 text-sm text-white rounded-xl"
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
                      Proceed for Triage
                    </button>
                    <p
                      className="border border-warning text-sm rounded-xl px-3 py-2 cursor-pointer"
                      onClick={handleClose}
                    >
                      Cancel
                    </p>
                  </div>
                </Grid>
              </Grid>
            </section>
            </Form>
          </Formik>
        </DialogContent>
      </Dialog>
    </div>
  );
}
