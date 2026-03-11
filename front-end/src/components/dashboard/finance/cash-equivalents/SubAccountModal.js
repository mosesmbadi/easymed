import React, { useState } from "react";
import { toast } from "react-toastify";
import { Grid, Switch, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { createSubAccount, updateSubAccount } from "@/redux/service/billing";
import { useAuth } from "@/assets/hooks/use-auth";

const SubAccountModal = ({ open, setOpen, selectedItem, setSelectedItem, mainAccounts }) => {
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  
  const [formData, setFormData] = useState({
    name: selectedItem?.name || "",
    description: selectedItem?.description || "",
    main_account: selectedItem?.main_account || "",
    opening_bal: selectedItem?.opening_bal || 0,
    min_bal: selectedItem?.min_bal || 0,
    max_bal: selectedItem?.max_bal || 0,
    min_trans: selectedItem?.min_trans || 0,
    max_trans: selectedItem?.max_trans || 0,
    active: selectedItem?.active !== undefined ? selectedItem.active : true,
  });

  // Extract array from paginated response if applicable
  const parsedMainAccounts = Array.isArray(mainAccounts)
    ? mainAccounts
    : (mainAccounts?.results || []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name: formData.name,
        description: formData.description,
        main_account: formData.main_account,
        opening_bal: formData.opening_bal,
        min_bal: formData.min_bal,
        max_bal: formData.max_bal,
        min_trans: formData.min_trans,
        max_trans: formData.max_trans,
        active: formData.active,
      };

      if (selectedItem?.id) {
        await updateSubAccount(auth, payload, selectedItem.id);
        toast.success("Sub account updated successfully!");
      } else {
        await createSubAccount(auth, payload);
        toast.success("Sub account created successfully!");
      }
      setOpen(false);
      setSelectedItem(null);
    } catch (error) {
      toast.error(error.message || "Failed to save sub account.");
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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        <h1 className="text-xl font-bold mb-2">
          {selectedItem ? "Edit Sub Account" : "Add Sub Account"}
        </h1>
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSave}>
          <Grid container spacing={2} className="mt-2 text-sm">
            <Grid item xs={12} md={6}>
              <label>Name</label>
              <input
                className="w-full border p-2 rounded block"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <label>Main Account</label>
              <select
                className="w-full border p-2 rounded block bg-white"
                name="main_account"
                value={formData.main_account}
                onChange={handleChange}
                required
              >
                <option value="">-- Select Main Account --</option>
                {parsedMainAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </Grid>
            
            <Grid item xs={12}>
              <label>Description</label>
              <textarea
                className="w-full border p-2 rounded block"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <label>Opening Balance</label>
              <input
                type="number"
                step="0.01"
                className="w-full border p-2 rounded block"
                name="opening_bal"
                value={formData.opening_bal}
                onChange={handleChange}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <label>Status</label>
              <div className="border p-2 rounded block">
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.active}
                      onChange={handleChange}
                      name="active"
                      color="primary"
                    />
                  }
                  label={formData.active ? "Active" : "Inactive"}
                />
              </div>
            </Grid>

            <Grid item xs={12} md={6}>
              <label>Min Bal</label>
              <input
                type="number"
                step="0.01"
                className="w-full border p-2 rounded block"
                name="min_bal"
                value={formData.min_bal}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <label>Max Bal</label>
              <input
                type="number"
                step="0.01"
                className="w-full border p-2 rounded block"
                name="max_bal"
                value={formData.max_bal}
                onChange={handleChange}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <label>Min Trans</label>
              <input
                type="number"
                step="0.01"
                className="w-full border p-2 rounded block"
                name="min_trans"
                value={formData.min_trans}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <label>Max Trans</label>
              <input
                type="number"
                step="0.01"
                className="w-full border p-2 rounded block"
                name="max_trans"
                value={formData.max_trans}
                onChange={handleChange}
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

export default SubAccountModal;

