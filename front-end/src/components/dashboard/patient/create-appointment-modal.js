import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { DialogTitle, Grid } from "@mui/material";
import { initiateNewAttendanceProcesses } from "@/redux/service/patients";
import { toast } from "react-toastify";
import { useAuth } from "@/assets/hooks/use-auth";

const CreateAppointmentModal = ({ setOpen, open, selectedRowData }) => {
  const [loading, setLoading] = React.useState(false);
  const auth = useAuth();

  const handleClose = () => {
    setOpen(false);
  };

  const initialValues = {
    patient: null,
    reason: "",
  };

  const validationSchema = Yup.object().shape({
    reason: Yup.string().required("Reason for visit required!"),
  });

  const initiateVisit = async (formValue, helpers) => {
    console.log("CALLED WITH", formValue);
    setLoading(true);

    try {
      const payload = {
        ...formValue,
        patient: selectedRowData?.id,
      };
      const response = await initiateNewAttendanceProcesses(payload, auth);
      console.log(response);
      setLoading(false);
      toast.success("New Visit Initiated Successfully!");
      handleClose();
    } catch (error) {
      toast.error("Error Initiating New Visit!");
      setLoading(false);
      handleClose();
    }
  };

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
          <div className="flex justify-between text-card">
            <p>{`${selectedRowData?.first_name || ''} ${selectedRowData?.second_name || ''}`}</p>
            <p>{selectedRowData?.phone || ''}</p>
            <p>{selectedRowData?.gender || ''}</p>
          </div>
        </DialogTitle>
        <DialogContent>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={initiateVisit}
          >
            <Form>
              <section className="space-y-1">
                <Grid container spacing={2}>
                  <Grid item md={12} xs={12}>
                    <label className="text-xs font-bold mb-3" htmlFor="reason">Reason For Visiting</label>
                    <Field
                      as="textarea"
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Reason For Visit"
                      name="reason"
                      rows={8}
                    />
                    <ErrorMessage
                      name="reason"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                </Grid>

                <div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="submit"
                      className="bg-primary rounded-xl text-sm px-4 py-2 text-white"
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
                          {/* spinner paths – keep as in your original */}
                        </svg>
                      )}
                      New Visit
                    </button>
                    <button
                      onClick={handleClose}
                      className="border border-warning rounded-xl text-sm px-4 py-2 text-[#02273D]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </section>
            </Form>
          </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default CreateAppointmentModal;