import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify"
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { DialogTitle, Divider } from "@mui/material";
import { Grid } from "@mui/material";
import { updateUser } from "@/redux/service/user";
import { useAuth } from "@/assets/hooks/use-auth";
import { getAllTheUsers } from "@/redux/features/users";
import UserDetailsUpdateForm from "./forms/UserDetailsUpdateForm";
import SecurityDetailsUpdateForm from "./forms/SecurityDetailsUpdateForm";

const EditUserDetailsModal = ({ open,setOpen,selectedRowData }) => {
    console.log("ROW_DATA ",selectedRowData);
    const [loading, setLoading] =  useState(false);
    const [updateSecurity, setUpdateSecurity]=useState(false)
    const auth = useAuth();
    const dispatch = useDispatch();

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
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
        <DialogTitle>
          <h1 className="text-2xl text-primary font-bold">{`Edit User ${updateSecurity ? "Security" : "Details"}`}</h1>
        </DialogTitle>
        <DialogContent>
          <div className="flex w-full gap-4 my-4 px-2">
            <p onClick={()=>setUpdateSecurity(false)} className={`${!updateSecurity ? "border-b border-primary_light text-primary_light font-semibold" : ""} px-2 cursor-pointer`}>User Details</p>
            <p onClick={()=>setUpdateSecurity(true)} className={`${updateSecurity ? "border-b border-primary_light text-primary_light font-semibold" : ""} px-2 cursor-pointer`}>Security</p>
          </div>

            {!updateSecurity && (
              <UserDetailsUpdateForm auth={auth} selectedRowData={selectedRowData} loading={loading} setLoading={setLoading} handleClose={handleClose}/>
              )}
              {updateSecurity && (
                <SecurityDetailsUpdateForm auth={auth} selectedRowData={selectedRowData} loading={loading} setLoading={setLoading} handleClose={handleClose}/>           
              )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default EditUserDetailsModal;
