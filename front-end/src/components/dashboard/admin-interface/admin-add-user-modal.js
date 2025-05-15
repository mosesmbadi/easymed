import React, { useState } from "react";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { useRouter } from "next/router";
import { registerUser } from "@/redux/service/auth";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { IoMdAdd } from "react-icons/io";

const AdminCreateNurseModal = () => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const initialValues = {
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  };

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required("First Name is required!"),
    last_name: Yup.string().required("Last Name is required!"),
    email: Yup.string()
      .email("This is not a valid email")
      .required("Email is required!"),
    password: Yup.string()
      .test(
        "len",
        "The password must be between 6 and 20 characters.",
        (val) =>
          !val || (val.toString().length >= 6 && val.toString().length <= 40)
      )
      .required("Password is required!"),
  });

  const handleRegister = async (formValue, helpers) => {
    try {
      const formData = {
        ...formValue,
        role: "nurse",
      };
      setLoading(true);
      await registerUser(formData).then(() => {
        helpers.resetForm();
        setLoading(false);
      });
    } catch (err) {
      console.log("SIGNUP_ERROR ", err);
    }
  };

  return (
    <>
      <button
        onClick={handleClickOpen}
        className="border border-card text-card font-semibold px-4 py-3 text-sm flex items-center gap-1"
      >
        <IoMdAdd /> Create Nurse
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
          <section className="flex items-center justify-center gap-8 overflow-hidden">
            <div className="w-full space-y-8 px-4">
              <h1 className="text-xl text-center">Create Nurse</h1>
              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleRegister}
              >
                <Form className="w-full">
                  <section className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-full">
                      <Field
                        className="block border border-gray py-2 text-sm rounded-xl px-4 focus:outline-none w-full"
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
                      <Field
                        className="block border border-gray rounded-xl text-sm py-2 px-4 focus:outline-none w-full"
                        type="text"
                        placeholder="Last Name"
                        name="last_name"
                      />
                      <ErrorMessage
                        name="last_name"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                    <div className="w-full">
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
                    </div>
                    <div className="w-full">
                      <Field
                        className="block border border-gray rounded-xl py-2 text-sm px-4 focus:outline-none w-full"
                        type="password"
                        placeholder="Password"
                        name="password"
                      />
                      <ErrorMessage
                        name="password"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-primary w-full rounded-xl px-8 py-2 text-sm text-white"
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
                      SignUp
                    </button>
                  </section>
                </Form>
              </Formik>
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminCreateNurseModal;
