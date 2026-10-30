import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { CiLocationOn } from "react-icons/ci";
import { BsTelephoneOutbound } from "react-icons/bs";
import { MdOutlineMarkEmailRead } from "react-icons/md";
import { IoIosHelpCircleOutline } from "react-icons/io";
import { CiYoutube } from "react-icons/ci";
import { CiFacebook } from "react-icons/ci";
import { CiLinkedin } from "react-icons/ci";
import { CiInstagram } from "react-icons/ci";
import { CiTwitter } from "react-icons/ci";
import { Grid } from "@mui/material";
import * as Yup from "yup";
import { ErrorMessage, Field, Form, Formik } from "formik";
import { toast } from "react-toastify";

const SupportModal = () => {
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);  
  
    const handleClickOpen = () => {
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };

    const initialValues = {
        fullName: "",
        email: "",
        message: ""
    };

    const validationSchema = Yup.object().shape({
        fullName: Yup.string().required("This field is required!"),
        email: Yup.string().required("This field is required!"),
        message: Yup.string().required("This field is required!"),
    });

    const raiseTicket = () => {
        toast.success("Ticket sent successfully")
        handleClose()
    }

  return (
    <section>
        <div onClick={handleClickOpen} className="flex items-center gap-2 cursor-pointer text-xs">
            <AiOutlineQuestionCircle className="" />
            <p>Support</p>
        </div>
        <Dialog
        fullWidth
        maxWidth="lg"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        >
        <DialogContent>
            <div className="flex bg-background">
            <div className="px-8 w-full bg-white ">
                <h2 className="text-center w-full font-bold text-2xl mb-4 mt-2 text-primary"> Raise A Ticket </h2>
                <div>
                    <Formik
                        initialValues={initialValues}
                        validationSchema={validationSchema}
                        onSubmit={raiseTicket}
                    >
                        <Form className="">
                        <Grid container spacing={2}>
                            <Grid item md={12} xs={12}>
                                <label>Full Name </label>
                                <Field
                                    className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                                    maxWidth="sm"
                                    placeholder="Enter Your Full Name"
                                    name="fullName"
                                />
                                <ErrorMessage
                                    name="fullName"
                                    component="div"
                                    className="text-warning text-xs"
                                />
                            </Grid>
                            <Grid item md={12} xs={12}>
                                <label>Email Address </label>
                                <Field
                                    className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                                    maxWidth="sm"
                                    placeholder="Enter Your Email Address"
                                    name="email"
                                />
                                <ErrorMessage
                                    name="email"
                                    component="div"
                                    className="text-warning text-xs"
                                />
                            </Grid>
                            <Grid item md={12} xs={12}>
                                <label>What issue have you encountered ? </label>
                                <Field
                                    as="textarea"
                                    className="block border rounded-xl text-sm border-gray py-4 px-4 focus:outline-card w-full"
                                    maxWidth="sm"
                                    placeholder="Type Your message"
                                    name="message"
                                    rows={6}
                                    wrap="hard"
                                />
                                <ErrorMessage
                                    name="message"
                                    component="div"
                                    className="text-warning text-xs"
                                />
                            </Grid>
                            <Grid item md={12} xs={12}>
                            <div className="flex items-center justify-start">
                                <button
                                type="submit"
                                className="bg-primary rounded-xl text-sm px-8 py-2 text-white"
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
                                Send Ticket
                                </button>
                            </div>
                            </Grid>
                        </Grid>
                        </Form>
                    </Formik>
                </div>
            </div>
            <div className="mx-8 w-full">
                <h2 className="text-center w-full font-bold text-2xl mb-4 mt-2 text-primary"> Contact Details </h2>
                <div className="py-2 border-b border-gray">
                    <h2 className="font-semibold mb-2">Address</h2>
                    <div className="flex gap-4 items-center text-xl mb-2">
                        <CiLocationOn />
                        <span>38779, Ngara Rd, Nairobi</span>
                    </div>
                </div>
                <div className="py-2 border-b border-gray">
                    <h2 className="font-semibold mb-2">Phone</h2>
                    <div className="flex gap-4 items-center text-xl mb-2">
                        <BsTelephoneOutbound />
                        <span>0722 123456</span>
                    </div>
                </div>
                <div className="py-2 border-b border-gray">
                    <h2 className="font-semibold mb-2">Email Address</h2>
                    <div className="flex gap-4 items-center text-xl mb-2">
                        <MdOutlineMarkEmailRead />
                        <span>easyhmis@mail.co.ke</span>
                    </div>
                </div>
                <div className="py-2 border-b border-gray">
                    <h2 className="font-semibold mb-2">HelpDesk</h2>
                    <div className="flex gap-4 items-center text-xl mb-2">
                        <IoIosHelpCircleOutline />
                    </div>
                </div>
                <div className="py-2">
                    <h2 className="font-semibold mb-2">Socials</h2>
                    <div className="flex justify-between items-center text-4xl mb-2">
                        <CiYoutube className="cursor-pointer"/>
                        <CiFacebook className="cursor-pointer" />
                        <CiLinkedin className="cursor-pointer" />
                        <CiInstagram className="cursor-pointer" />
                        <CiTwitter className="cursor-pointer" />
                    </div>                
                </div>
            </div>
            </div>

        </DialogContent>
        </Dialog>
    </section>
  )
}

export default SupportModal