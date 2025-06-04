import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import { useSelector,useDispatch } from "react-redux";
import { getAllInsurance } from "@/redux/features/insurance";
import { editPatient } from "@/redux/service/patients";
import { toast } from 'react-toastify'
import { getAllPatients } from "@/redux/features/patients";
import { useAuth } from "@/assets/hooks/use-auth";

const EditPatientDetails = ({ open, setOpen, selectedRowData }) => {
  const [loading, setLoading] = useState(false);
  const { insurance } = useSelector((store) => store.insurance);
  const dispatch = useDispatch();
  const auth = useAuth()

  useEffect(() =>{
    if(auth.token){
      dispatch(getAllInsurance(auth));
    }
  },[])

  const handleClose = () => {
    setOpen(false);
  };

  const getGenderValue = () =>{
    if(selectedRowData?.gender?.toLowerCase() === "male"){
      return "M"
    }else if(selectedRowData?.gender?.toLowerCase() === "female"){
      return "F"
    }else{
      return null
    }
  }

  const patientInsurances = () =>{
    if(selectedRowData?.insurances?.length > 0){
      let ids = [];
      selectedRowData?.insurances.forEach((insurance)=> {
        ids.push(`${insurance.id}`)
      })
      return ids 
    }else{
      return null
    }
  }

  const initialValues = {
    first_name: selectedRowData?.first_name || "",
    second_name: selectedRowData?.second_name || "",
    date_of_birth: selectedRowData?.date_of_birth || "",
    gender: getGenderValue() || "",
    insurances: patientInsurances(),
    user_id: selectedRowData?.user_id || null,
    phone: selectedRowData?.phone || null,
    email: selectedRowData?.email || null
  };

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required("First Name is required!"),
    second_name: Yup.string().required("Second Name is required!"),
    date_of_birth: Yup.string().required("Date is required!"),
    gender: Yup.string().required("Select gender!"),
    phone: Yup.string().required("Phone NUmber is Required!"),
    email: Yup.string().required("Email Address is Required!"),
  });

  const handleEditPatient = async (formValue, helpers) => {
    console.log("EDIT_PAYLOAD ", formValue);
    try {
      const formData = {
        ...formValue,
        id:selectedRowData?.id,
      };
      setLoading(true);
      await editPatient(formData, auth).then(() => {
        helpers.resetForm();
        toast.success("Patient Edited Successfully!");
        setLoading(false);
        dispatch(getAllPatients(auth));
        handleClose();
      });
    } catch (err) {
      toast.error(err);
      console.log("EDIT_ERROR ", err);
    }
  };

  return (
    <section>
      <Dialog
        fullWidth
        maxWidth="md"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleEditPatient}
          >
            <Form>
              <section className="space-y-2">
                <Grid container spacing={2}>
                  <Grid item md={4} xs={12}>
                    <Field
                      className="block border border-gray py-3 px-4 focus:outline-none w-full"
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
                  <Grid item md={4} xs={12}>
                    <Field
                      className="block border border-gray py-3 px-4 focus:outline-none w-full"
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
                  <Grid item md={4} xs={12}>
                    <Field
                      className="block border border-gray py-3 px-4 focus:outline-none w-full"
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
                  <Grid item md={4} xs={12}>
                    <Field
                      as="select"
                      className="block pr-9 border border-gray py-3 px-4 focus:outline-none w-full"
                      name="gender"
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </Field>
                    <ErrorMessage
                      name="gender"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                    <Field
                      className="block border border-gray py-3 px-4 focus:outline-none w-full"
                      type="text"
                      placeholder="Phone Number"
                      name="phone"
                    />
                    <ErrorMessage
                      name="phone"
                      component="div"
                      className="text-warning text-xs"
                    />
                  </Grid>
                  <Grid item md={4} xs={12}>
                    <Field
                      className="block border border-gray py-3 px-4 focus:outline-none w-full"
                      type="text"
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
                <div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="submit"
                      className="bg-primary px-4 py-2 text-white"
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
                      Edit Patient
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

export default EditPatientDetails;
