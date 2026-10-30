import React, { useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import { createPatient } from "@/redux/service/patients";
import { toast } from "react-toastify";
import { useSelector, useDispatch } from "react-redux";
import { getAllOrderBills, getItems } from "@/redux/features/inventory";
import { getAllDoctors } from "@/redux/features/doctors";
import { useAuth } from "@/assets/hooks/use-auth";
import { createAppointment } from "@/redux/service/appointment";
import { getAllServices } from "@/redux/features/patients";
import { getAllLabTestProfiles } from "@/redux/features/laboratory";

const LabServiceModal = () => {
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const dispatch = useDispatch();
  const { orderBills, item } = useSelector((store) => store.inventory);
  const { labTestProfiles } = useSelector((store) => store.laboratory);
  const auth = useAuth();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  
  const initialValues = {
    first_name: "",
    second_name: "",
    date_of_birth: "",
    gender: "",
    appointment_date_time: "",
    status: "pending",
    reason: "",
    test_profile: "",
    lab_request: null,
  };

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required("FirstName is required!"),
    second_name: Yup.string().required("Second Name is required!"),
    date_of_birth: Yup.string().required("Date is required!"),
    gender: Yup.string().required("Select gender!"),
    appointment_date_time: Yup.string().required("Date is required!"),
    test_profile: Yup.string().required("Provide a test profile!"),
  });


  const handleFileChange = (event, formik) => {
    formik.setFieldValue("lab_request", event.currentTarget.files[0]);
  };

  const handleLabRequest = async (formValue, helpers) => {
    console.log("FORM_VALUE ", formValue);
    try {
      setLoading(true);
      await publicLabRequest(formValue).then(() => {
        helpers.resetForm();
        toast.success("Lab Request sent successfully!");
        setLoading(false);
        router.push("/");
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
      console.log("APPOINTMENT_ERROR ", err);
    }
  };

  useEffect(() => {
    dispatch(getAllServices());
    dispatch(getAllLabTestProfiles());
  }, []);


  return (
    <section>
      <p onClick={handleClickOpen} className="text-sm">
        Laboratory Service
      </p>
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
            onSubmit={handleLabRequest}
          >
            {(formik) => (
              <Form>
                <Grid container spacing={2}>
                  <Grid item md={6} xs={12} className="space-y-4">
                    <div className="w-full">
                      <label htmlFor="first_name">First Name</label>
                      <Field
                        className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                        type="text"
                        placeholder="First Name"
                        name="first_name"
                      />
                      <ErrorMessage
                        name="first_name"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                    <div className="w-full">
                      <label htmlFor="gender">Gender</label>
                      <Field
                        as="select"
                        className="block text-sm pr-9 border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                        name="gender"
                      >
                        <option value="">Select Gender</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </Field>

                      <ErrorMessage
                        name="gender"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                    <div className="w-full">
                      <label htmlFor="date_of_birth">Date of Birth</label>
                      <Field
                        className="block text-sm border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                        type="date"
                        placeholder="Date of birth"
                        name="date_of_birth"
                      />
                      <ErrorMessage
                        name="date_of_birth"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                  </Grid>
                  <Grid item md={6} xs={12} className="space-y-4">
                    <div className="w-full">
                      <label htmlFor="second_name">Second Name</label>
                      <Field
                        className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                        type="text"
                        placeholder="Second Name"
                        name="second_name"
                      />
                      <ErrorMessage
                        name="second_name"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>

                    <div className="w-full">
                      <label htmlFor="appointment_date_time">
                        Appointment Date
                      </label>
                      <Field
                        className="block border text-sm border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                        type="date"
                        placeholder="Appointment Date"
                        name="appointment_date_time"
                      />
                      <ErrorMessage
                        name="appointment_date_time"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="test_profile">Test Profile</label>
                      <Field
                        as="select"
                        className="block text-sm pr-9 border border-gray rounded-xl py-2 px-4 focus:outline-none w-full"
                        name="test_profile"
                      >
                        <option value="">Select Test Profile</option>
                        {labTestProfiles.map((test, index) => (
                          <option key={index} value="H">
                            {test?.name}
                          </option>
                        ))}
                      </Field>

                      <ErrorMessage
                        name="test_profile"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                  </Grid>
                </Grid>
                <div className="w-full my-4">
                  <label htmlFor="reason">Upload Document</label>
                  <input
                    id="file"
                    name="lab_request"
                    type="file"
                    onChange={(event) => handleFileChange(event, formik)}
                  />
                </div>
                <div className="w-full my-4">
                  <label htmlFor="reason">Reason</label>
                  <Field
                    className="block border border-gray rounded-xl text-sm py-3 px-4 focus:outline-none w-full"
                    as="textarea"
                    placeholder="Reason"
                    name="reason"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-primary text-sm w-full rounded-xl px-8 py-2 text-white"
                >
                  Submit
                </button>
              </Form>
            )}
          </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default LabServiceModal;
