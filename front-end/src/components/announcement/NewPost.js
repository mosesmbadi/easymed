import React, { useEffect, useState } from "react";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import * as Yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllAnnouncementsChannels, getAllAnnouncements } from "@/redux/features/announcements";
import { postAnnouncements } from "@/redux/service/announcements";
import SeachableSelect from "../select/Searchable";

const NewPostModal = () => {
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = useState(false);
    const channels = useSelector((store)=> store.announcement.channels)
    console.log(channels);
    const dispatch = useDispatch();
    const auth = useAuth();

    useEffect(() => {
        if(auth){
            dispatch(getAllAnnouncementsChannels(auth));
        }        
    }, [auth]);
  
    const handleClickOpen = () => {
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };
  
  
    const initialValues = {
      title: "",
      content: "",
      created_by: auth?.user_id,
      channel: null
    };
  
    const validationSchema = Yup.object().shape({
      title: Yup.string().required("This field is required!"),
      content: Yup.string().required("This field is required!"),
      channel: Yup.object().required("This field is required!")
    });
  
    const postAnnouncement = async (formValue, helpers) => {
  
      try {
        setLoading(true);
        const formData = {
          ...formValue,
          channel: formValue.channel.value,
        };
        console.log(formData)

        await postAnnouncements(auth, formData);
   
        toast.success("Posted Announcement successfully");
        dispatch(getAllAnnouncements(auth))
        
        setLoading(false);
        handleClose();
  
      } catch (err) {
        toast.error(err);
        setLoading(false);
      }
    };
  return (
    <section className="w-full p-2">
        <div className="w-full px-4 py-4 rounded-lg border border-background shadow-lg">
            <div className='rounded-xl w-full px-4 py-2 cursor-pointer flex items-center gap-2'>
                <div onClick={handleClickOpen} className="py-2 w-full border bg-white text-center rounded-3xl border-gray text-gray"> 
                     Share your latest update here ! What is the big news ? #NewAnnouncement ! !
                </div>                
            </div>
        </div>
        <Dialog
        fullWidth
        maxWidth="sm"
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        >
            <DialogContent>
                <h3 className="text-2xl my-4 font-bold"> Announcement </h3>
            <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={postAnnouncement}
            >
            <Form className="">
                <Grid container spacing={4}>
                <Grid className='my-2' item md={12} xs={12}>
                <SeachableSelect
                    label="Select Channel"
                    name="channel"
                    options={channels.map((channel) => ({ value: channel.id, label: `${channel?.name}` }))}
                />
                <ErrorMessage
                    name="channel"
                    component="div"
                    className="text-warning text-xs"
                />
                </Grid>
                <Grid className='flex flex-col gap-1' item md={12} xs={12}>
                    <Field
                        className="p-1 border border-gray rounded"
                        type="text" 
                        name="title" 
                        placeholder="Add title to the announcement"
                    />
                    <ErrorMessage
                    name="title"
                    component="div"
                    className="text-warning text-xs"
                    />
                </Grid>
                <Grid className='flex flex-col gap-1' item md={12} xs={12}>
                    <Field 
                    as="textarea"
                    className="p-1 focus:border-gray border border-gray rounded"
                    type="text" 
                    name="content" 
                    placeholder="Content ..." 
                    />
                    <ErrorMessage
                    name="content"
                    component="div"
                    className="text-warning text-xs"
                    />
                </Grid>
                <Grid item md={12} xs={12}>
                    <div className="flex items-center justify-end">
                    <button
                        type="submit"
                        className="bg-primary rounded-xl text-sm px-8 py-4 text-white"
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
                        Post
                    </button>
                    </div>
                </Grid>
                </Grid>
            </Form>
            </Formik>
            </DialogContent>
        </Dialog>
    </section>
  )
}

export default NewPostModal;