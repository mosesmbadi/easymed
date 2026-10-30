import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { DialogTitle } from "@mui/material";

const DayTotalsPerPayMode = ({setTotalsViewOPen, totalsViewOPen, infoAsPerPayMode, selectedPayMethod}) => {

    const handleClose = () => {
        setTotalsViewOPen(false);
    };
  
  return (
    <section>

    <Dialog
      fullWidth
      maxWidth="sm"
      open={totalsViewOPen}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle className="w-full bg-gray font-bold items-center justify-center flex">{`Todays ${selectedPayMethod} total amount`}</DialogTitle>
      <DialogContent>
        <div className="items-center justify-center flex ">
          <h2 className="font-bold text-2xl">{`${selectedPayMethod}: ${infoAsPerPayMode ? infoAsPerPayMode?.total_amount : 0}`}</h2>
        </div>
      </DialogContent>
    </Dialog>
  </section>
  )
}

export default DayTotalsPerPayMode