import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Grid, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { createMainAccount, fetchMainAccounts, updateMainAccount } from "@/redux/service/billing";
import { useAuth } from "@/assets/hooks/use-auth";

const MainAccountModal = ({ open, setOpen, selectedItem, setSelectedItem }) => {
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: selectedItem?.name || "",
        description: selectedItem?.description || "",
      });
    }
  }, [selectedItem, open]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description,
      };

      if (selectedItem?.id) {
        await updateMainAccount(auth, payload, selectedItem.id);
        toast.success("Main account updated successfully!");
      } else {
        await createMainAccount(auth, payload);
        toast.success("Main account created successfully!");
      }
      setOpen(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error(error.message || "Failed to save main account.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedItem(null);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <h1 className="text-xl font-bold mb-2">
          {selectedItem ? "Edit Main Account" : "Add Main Account"}
        </h1>
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSave}>
          <Grid container spacing={2} className="mt-2">
            <Grid item xs={12}>
              <label>Name</label>
              <input
                className="w-full border p-2 rounded block"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <label>Description</label>
              <textarea
                className="w-full border p-2 rounded block"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </Grid>
          </Grid>
          <DialogActions className="mt-4">
            <button
              type="button"
              className="px-4 py-2 border rounded"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </DialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MainAccountModal;

