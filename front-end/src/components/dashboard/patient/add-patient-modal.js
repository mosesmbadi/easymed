import React, { useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import { IoMdAdd } from "react-icons/io";
import { createPatient, patientNextOfKin, patientNextOfKinContact } from "@/redux/service/patients";
import { toast } from "react-toastify";
import { getAllInsurance } from "@/redux/features/insurance";
import { useSelector, useDispatch } from "react-redux";
import { getAllPatients } from "@/redux/features/patients";
import { useAuth } from "@/assets/hooks/use-auth";

const AddPatientModal = () => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const dispatch = useDispatch();
  const auth = useAuth()
  const { insurance } = useSelector((store) => store.insurance);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    dispatch(getAllInsurance(auth));
  }, []);

  const initialValues = {
    first_name: "",
    second_name: "",
    date_of_birth: "",
    gender: "",
    phone: "",
    email: "",
    insurances: [],
    kin_first_name: null,
    kin_second_name: null,
    kin_phone: null,
    kin_email:null,
    residence: null,
    relationship: null,
    unique_id: ""
  };

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required("First Name is required!"),
    second_name: Yup.string().required("Second Name is required!"),
    // kin_first_name: Yup.string().required("Next Kin First Name is required!"),
    // kin_second_name: Yup.string().required("Next Kin Second Name is required!"),
    date_of_birth: Yup.date()
    .required("Date is required!")
    .max(new Date(), "Date of birth cannot be in the future"),
    gender: Yup.string().required("Select gender!"),
    phone: Yup.number().required("Phone Number is required!"),
    unique_id: Yup.number().required("Id Number is required!"),
    // kin_phone: Yup.number().required("Next Kin Phone Number is required!"),
    email: Yup.string().required("Email is required!"),
    // kin_email: Yup.string().required("Next Kin Email is required!"),
    // relationship: Yup.string().required("Relationship is required!"),
    // residence: Yup.string().required("location is required!"),
  });

  const createPatientNextOfKin = async (patient_id, next_of_kin, contact) => {
    const payload = {
      ...next_of_kin,
      patient: patient_id,
      contacts: contact
    }

    try {
      const nextOfKin = await patientNextOfKin(payload, auth)
      console.log("SUCCESS CREATING NEXT OF KIN", nextOfKin)
      
    }catch(err){
      console.log("ERROR CREATING NEXT OF KIN", err)
    }

  }

  const handleCreatePatient = async (formValue, helpers) => {
    try {
      const patientPayload = {
        first_name: formValue.first_name,
        second_name: formValue.second_name,
        date_of_birth: formValue.date_of_birth,
        gender: formValue.gender,
        phone: formValue.phone,
        email: formValue.email,
        insurances: formValue.insurances,
        user_id: parseInt(formValue.user_id),
        unique_id: parseInt(formValue.unique_id)
      }

      const netOfKin = {
        first_name: formValue.kin_first_name,
        second_name: formValue.kin_second_name,
        relationship: formValue.relationship,
      }

      const nextOfKinContacts = {
        email_address:formValue.kin_email,
        residence: formValue.residence,
        tel_no: formValue.kin_phone,
      }

      setLoading(true);

      const nextOfKinContactResponse = await patientNextOfKinContact(nextOfKinContacts, auth)

      await createPatient(patientPayload, auth).then((res) => {
        helpers.resetForm();
        createPatientNextOfKin(res.id, netOfKin, nextOfKinContactResponse.id)
        toast.success("Patient Created Successfully!");
        setLoading(false);
        dispatch(getAllPatients(auth));
        handleClose();
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  return (
    <section>
      <button
        onClick={handleClickOpen}
        className="bg-primary text-white px-4 rounded-xl py-2 text-sm flex items-center gap-1"
      >
        <IoMdAdd /> Create Patient
      </button>
      <Dialog
        fullWidth
        maxWidth="lg"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleCreatePatient}
          >
            <Form>
              <section className="space-y-1">
              <h2 className="text-sm font-semibold text-primary">Patients Details</h2>
                <Grid className="py-3 " container spacing={1}>
                  <Grid item md={3} xs={12}>
                    <label htmlFor="first_name">First Name</label>
                    <Field
                      className="block border border-gray rounded-xl py-2 text-sm px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="First Name"
                      name="first_name"
                    />
                    <ErrorMessage
                      name="first_name"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={3} xs={12}>
                  <label htmlFor="second_name">Last Name</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Second Name"
                      name="second_name"
                    />
                    <ErrorMessage
                      name="second_name"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={3} xs={12}>
                  <label htmlFor="date_of_birth">Date of Birth</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="date"
                      placeholder="Date of Birth"
                      name="date_of_birth"
                    />
                    <ErrorMessage
                      name="date_of_birth"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={3} xs={12}>
                  <label htmlFor="gender">Select Gender</label>
                    <Field
                      as="select"
                      className="block pr-9 border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
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
                  </Grid>
                  <Grid item md={3} xs={12}>
                  <label htmlFor="second_name">Id Number</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-3 focus:outline-none w-full"
                      type="number"
                      placeholder="Id Number"
                      name="unique_id"
                    />
                    <ErrorMessage
                      name="unique_id"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={3} xs={12}>
                  <label htmlFor="second_name">Phone Number</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="number"
                      placeholder="Phone Number"
                      name="phone"
                    />
                    <ErrorMessage
                      name="phone"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={3} xs={12}>
                  <label htmlFor="second_name">Email</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="email"
                      placeholder="Email"
                      name="email"
                    />
                    <ErrorMessage
                      name="email"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={3} xs={12}>
                    <label htmlFor="insurances">Insurance</label>
                    <Field
                        as="select"
                        className="block pr-9 border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                        name="insurances" 
                        multiple={true} 
                    >
                        <option value="" disabled>
                            Select Insurance
                        </option>
                        {insurance.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </Field>
                    <ErrorMessage
                        name="insurances"
                        component="div"
                        className="text-warning text-xs"
                    />
                </Grid>
                </Grid>
                <h2 className="text-sm font-semibold text-primary">Next Of Kin Details</h2>
                <Grid container spacing={1}>
                <Grid item md={4} xs={12}>
                    <label htmlFor="first_name">First Name</label>
                    <Field
                      className="block border border-gray rounded-xl py-2 text-sm px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="First Name"
                      name="kin_first_name"
                    />
                    <ErrorMessage
                      name="kin_first_name"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                  <label htmlFor="second_name">Last Name</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Second Name"
                      name="kin_second_name"
                    />
                    <ErrorMessage
                      name="kin_second_name"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                  <label htmlFor="second_name">Relationship</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Relationship to patient"
                      name="relationship"
                    />
                    <ErrorMessage
                      name="relationship"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                  <label htmlFor="second_name">Phone Number</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="number"
                      placeholder="Phone Number"
                      name="kin_phone"
                    />
                    <ErrorMessage
                      name="kin_phone"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                  <label htmlFor="second_name">Email Address</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="email"
                      placeholder="Email Address"
                      name="kin_email"
                    />
                    <ErrorMessage
                      name="kin_email"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                  <label htmlFor="second_name">Residence Location</label>
                    <Field
                      className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Residence Location"
                      name="residence"
                    />
                    <ErrorMessage
                      name="residence"
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
                      Save Patient
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

export default AddPatientModal;
