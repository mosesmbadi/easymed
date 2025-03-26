import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { DialogTitle } from "@mui/material";

export default function ConfirmPermissionModal({ 
  confirmOpen, 
  setConfirmOpen, 
  onConfirm, 
  perm, 
  group 
}) {
  const handleClose = () => {
    setConfirmOpen(false);
  };

  return (
    <Dialog open={confirmOpen} onClose={handleClose} aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">
        <p className="text-sm font-semibold">Confirm Permission Assignment</p>
      </DialogTitle>
      <DialogContent>
        <p>Are you sure you want to add <strong>{perm?.name}</strong> to <strong>{group?.name}</strong>?</p>
        <div className="flex items-center gap-2 justify-end mt-3">
          <button
            onClick={onConfirm}
            className="bg-primary px-3 py-2 text-sm text-white rounded-xl"
          >
            Yes, Add Permission
          </button>
          <p
            className="border border-warning text-sm rounded-xl px-3 py-2 cursor-pointer"
            onClick={handleClose}
          >
            Cancel
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
