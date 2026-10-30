import React,{useState} from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { toast } from "react-toastify";

export default function DischargePatientModal({selectedRecords,}) {
    const [open,setOpen] = useState(false);

  console.log("DISCHARGED_RECORDS ", selectedRecords);

  const handleClose = () => {
    setOpen(false);
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const dischargePatients = async() => {
    // make api call to discharge selected Patients
  }

  return (
    <div>
        <button
        onClick={handleClickOpen}
        className="bg-primary text-white px-3 py-3 text-sm"
      >
        Discharge Patient
      </button>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <section className="space-y-6">
            <p>Are you sure you want to discharge the selected patients?</p>
            <div className="flex items-center gap-2 justify-center mt-3">
              <button
                type="submit"
                onClick={dischargePatients}
                className="bg-success rounded px-3 py-2 text-white"
              >
                Yes Proceed
              </button>
              <button
                className="border border-warning rounded px-3 py-2"
                onClick={handleClose}
              >
                Cancel
              </button>
            </div>
          </section>
        </DialogContent>
      </Dialog>
    </div>
  );
}
