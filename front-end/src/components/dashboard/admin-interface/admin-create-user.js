import React, { useEffect, useState } from "react";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { createUser, registerUser } from "@/redux/service/auth";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { IoMdAdd } from "react-icons/io";
import { getAllDoctors } from "@/redux/features/doctors";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "@/assets/hooks/use-auth";
import { toast } from "react-toastify";
import { getAllGroups } from "@/redux/features/auth";
import SeachableSelect from "@/components/select/Searchable";
import { GoEye, GoEyeClosed } from "react-icons/go";

const AdminCreateUser = ({role}) => {
  const [password, setPassword]= useState("password");
  const [passwordConfirmation, setPasswordConfirmation]= useState("password");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = React.useState(false);
  const { groups } = useSelector((store) => store.auth);
  const dispatch = useDispatch();
  const authUser = useAuth();

  const passwordVisibilityToggle = () => {
    if(password === "password"){
      setPassword("text")
    }else{
      setPassword("password")
    }
  }

  const passwordConfirmationVisibilityToggle = () => {
    if(passwordConfirmation === "password"){
      setPasswordConfirmation("text")
    }else{
      setPasswordConfirmation("password")
    }
  }


  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (authUser) {
      dispatch(getAllDoctors(authUser));
      dispatch(getAllGroups(authUser));
    }
  }, [authUser]);

  const setRole = ()=> {
    let theRole = role;
    if( theRole === "labtech"){
      theRole = "lab_tech"
    }
    const roleSelected = groups.find((group) => group.name.toLowerCase() === theRole);
    if (roleSelected) {
      return { value: roleSelected.id, label: roleSelected.name };
    }
    return "";
  }

  const initialValues = {
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    password_confirmation:"",
    phone: "",
    role: role || "" ,
    group: setRole()
  };

  const validationSchema = Yup.object().shape({
    first_name: Yup.string().required("First Name is required!"),
    phone: Yup.number().required("Phone Number is required!"),
    last_name: Yup.string().required("Last Name is required!"),
    group: Yup.object().required("Role is required!"),
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
    password_confirmation: Yup
    .string()
    .required('Please confirm your password.')
    .oneOf([Yup.ref('password')], 'Your passwords do not match.')
  });

  const handleCreateUser = async (formValue, helpers) => {
    try {
      const formData = {
        ...formValue,
        role: (formValue.group.label).toLowerCase(),
        group: formValue.group.value,
        profession: "",
      };
      setLoading(true);
      await createUser(formData, authUser).then(() => {
        helpers.resetForm();
        setLoading(false);
        handleClose();
        toast.success("User Created Successfully!");
        dispatch(getAllDoctors(authUser));
      });
    } catch (err) {
      setLoading(false);
      toast.error(err);
    }
  };

  return (
    <>
      <button
        onClick={handleClickOpen}
        className="bg-primary rounded-xl text-white px-4 py-2 text-sm flex items-center gap-1"
      >
        <IoMdAdd /> Create User
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
            <div className="w-full space-y-4 px-4">
              <h1 className="text-xl text-center">Create User</h1>
              <Formik
                initialValues={initialValues}
                validationSchema={validationSchema}
                onSubmit={handleCreateUser}
              >
                <Form className="w-full">
                  <section className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-full">
                    <SeachableSelect
                      label="Assign Role"
                      name="group"
                      options={groups.map((group) => ({ value: group.id, label: `${group?.name}` }))}
                    />
                    <ErrorMessage
                      name="group"
                      component="div"
                      className="text-warning text-xs"
                    />
                      {/* <Field
                        as="select"
                        className="block pr-9 border border-gray rounded-xl py-2 text-sm px-4 focus:outline-none w-full"
                        name="group"
                      >
                        <option value="">Assign Role</option>
                        {groups.map((item) => (
                          <option key={item?.id} value={item.id}>
                            {item?.name}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage
                        name="group"
                        component="div"
                        className="text-warning text-xs"
                      /> */}
                    </div>
                    <div className="w-full">
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
                    </div>
                    <div className="w-full">
                      <Field
                        className="block border border-gray rounded-xl py-2 text-sm px-4 focus:outline-none w-full"
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
                        className="block border border-gray rounded-xl py-2 text-sm px-4 focus:outline-none w-full"
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
                        type="text"
                        placeholder="Phone Number"
                        name="phone"
                      />
                      <ErrorMessage
                        name="phone"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                    <div className="w-full">
                      <div className="flex justify-between border border-gray rounded-xl items-center pr-2">
                        <Field
                          className="block text-sm py-2 rounded-xl px-4 focus:outline-none w-full"
                          type={password}
                          placeholder="Password"
                          name="password"
                        />
                        {password === "password" ? <GoEye onClick={passwordVisibilityToggle} className="cursor-pointer"/> : <GoEyeClosed onClick={passwordVisibilityToggle} className="cursor-pointer" />}
                      </div>
                      <ErrorMessage
                        name="password"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                    <div className="w-full">
                      <div className="flex justify-between border border-gray rounded-xl items-center pr-2">
                        <Field
                          className="block text-sm py-2 rounded-xl px-4 focus:outline-none w-full"
                          type={passwordConfirmation}
                          placeholder="Confirm Password"
                          name="password_confirmation"
                        />
                        {passwordConfirmation === "password" ? <GoEye onClick={passwordConfirmationVisibilityToggle} className="cursor-pointer"/> : <GoEyeClosed onClick={passwordConfirmationVisibilityToggle} className="cursor-pointer" />}
                      </div>
                      <ErrorMessage
                        name="password_confirmation"
                        component="div"
                        className="text-warning text-xs"
                      />
                    </div>
                    {/* <div className="w-full">
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
                    </div> */}
                    <button
                      type="submit"
                      className="bg-primary w-full px-8 py-2 rounded-xl text-white"
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
                      Create User
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

export default AdminCreateUser;
