import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { BsFillExclamationCircleFill } from "react-icons/bs";

const VersionModal = () => {
    const [open, setOpen] = useState(false);
  
  
    const handleClickOpen = () => {
      setOpen(true);
    };
  
    const handleClose = () => {
      setOpen(false);
    };
  return (
    <section>
        <div onClick={handleClickOpen} className="flex items-center gap-2 cursor-pointer">
            <BsFillExclamationCircleFill className="" />
            <p>About</p>
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
                <div className="py-4">
                    <h2 className="w-full text-center my-2 text-xl"> EaSYMed</h2>
                    <p className="w-full text-center my-2">{process.env.NEXT_PUBLIC_HMIS_VERSION}</p>
                    <p className="w-full text-center my-2 text-xl">29ᵗʰ February, 2024</p>
                </div>
            </DialogContent>
        </Dialog>
    </section>
  )
}

export default VersionModal