import React, { useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid, Typography } from "@mui/material";
import { createPatient } from "@/redux/service/patients";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { getAllOrderBills, getItems } from "@/redux/features/inventory";
import { getAllDoctors } from "@/redux/features/doctors";
import { useAuth } from "@/assets/hooks/use-auth";
import { createAppointment } from "@/redux/service/appointment";
import { getAllAppointmentsByPatientId } from "@/redux/features/appointment";
import FormikFieldDateTimePicker from "@/components/dateandtime/FormikFieldDateTimePicker";

const mb = { marginBottom: 8 };

const BookAppointmentModal = ({loggedInPatient}) => {
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const dispatch = useDispatch();
  const { orderBills, item } = useSelector((store) => store.inventory);
  const { doctors } = useSelector((store) => store.doctor);
  const auth = useAuth();

  const timezoneList = {
    nairobi: "Africa/Nairobi" // +3:00
  };
  const timezone = timezoneList.nairobi;

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    dispatch(getAllOrderBills());
    dispatch(getItems(auth));
    if (auth) {
      dispatch(getAllDoctors(auth));
    }
  }, []);

  const initialValues = {
    patient: loggedInPatient?.id,
    appointment_date_time: new Date().toISOString(),
    status: "pending",
    reason: "",
    // fee: "",
    // assigned_doctor: null,
    item: 1,
  };

  console.log("INITIAL VALUE", initialValues)

  const validationSchema = Yup.object().shape({
    appointment_date_time: Yup.string().required("Date is required!"),
    reason: Yup.string().required("Reason is required!"),
    // fee: Yup.string().required("Fee is required!"),
    // assigned_doctor: Yup.string().required("Assign Doctor!"),
    // item_id: Yup.string().required("Select Item!"),
  });

  const handleCreateAppointment = async (formValue, helpers) => {
    console.log("APPOINTMENT_DATA ", formValue);
    const formData = {
      ...formValue,
      //   patient: selectedRowData?.id,
    };
    console.log("FORM_DATA ", formData);
    try {
      setLoading(true);
      await createAppointment(formData).then(() => {
        helpers.resetForm();
        toast.success("Appointment Created Successfully!");
        setLoading(false);
        dispatch(dispatch(getAllAppointmentsByPatientId(formValue.patient)));
        handleClose();
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  return (
    <section>
      <button onClick={handleClickOpen} className='bg-white text-primary p-4 rounded-lg'>
          Book Appointment
      </button>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleCreateAppointment}
          >
            {({ values, errors }) => (
            <Form style={{ margin: 16 }}>
              <section className="space-y-1">
                <Grid container spacing={4} style={mb}>
                <Grid item md={12} xs={12}>
                  <Typography variant="subtitle1" gutterBottom style={mb}>
                  Appointment Date and Time
                  </Typography>
                  <Field
                    name="appointment_date_time"
                    component={FormikFieldDateTimePicker}
                    inputVariant="outlined"
                    timezone={timezone}
                    helperText="Timezone specified"
                    clearable
                    margin="dense"
                  />
                  <ErrorMessage
                      name="appointment_date_time"
                      component="div"
                      className="text-warning text-xs"
                  />
                </Grid>
                  
                </Grid>
                <Grid container spacing={2}>
                  <Grid item md={12} xs={12}>
                    <label htmlFor="second_name">Reason</label>
                    <Field
                      as="textarea"
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Reason"
                      name="reason"
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
                      Create Appointment
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
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default BookAppointmentModal;
