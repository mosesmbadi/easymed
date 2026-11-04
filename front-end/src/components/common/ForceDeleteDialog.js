import React, { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { toast } from "react-toastify";
import UseAxios from "@/assets/hooks/use-axios";
import { useAuth } from "@/assets/hooks/use-auth";
import { APP_API_URL } from "@/assets/api-endpoints";

const CONFIRM_WORD = "DELETE";

/**
 * Deletes a record for an admin, in two steps when it has history.
 *
 * The first attempt is a plain delete, which the server refuses if other
 * records depend on it, saying which. Only then is the override offered, and
 * it has to be typed: it removes those records for good.
 */
const ForceDeleteDialog = ({ open, setOpen, resource, id, name, onDeleted }) => {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [dependents, setDependents] = useState(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) {
      setDependents(null);
      setTyped("");
    }
  }, [open, id]);

  const submit = async (force) => {
    setLoading(true);
    try {
      await UseAxios(auth).post(APP_API_URL.DELETE_RECORD, { resource, id, force });
      toast.success(`${name} deleted`);
      setOpen(false);
      onDeleted?.();
    } catch (error) {
      const data = error.response?.data;
      if (error.response?.status === 409 && data?.can_force) {
        setDependents(data.dependents ?? []);
      } else {
        toast.error(data?.error_message || data?.detail || "Could not delete this record");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={() => setOpen(false)}>
      <DialogContent>
        {dependents === null ? (
          <h1 className="text-center">Delete {name}?</h1>
        ) : (
          <div className="space-y-3 text-sm">
            <h1 className="font-semibold text-base">{name} has records that depend on it</h1>
            <ul className="list-disc pl-6">
              {dependents.map((row) => (
                <li key={row.label}>{row.count} {row.label}</li>
              ))}
            </ul>
            <p className="text-warning">
              Continuing permanently deletes these too, along with anything that depends on them,
              and cannot be undone. Only do this for test or demo data, never for a real
              patient&apos;s or the facility&apos;s real records.
            </p>
            <label className="block">
              Type {CONFIRM_WORD} to continue
              <input
                className="block border border-gray rounded-md py-2 px-3 mt-1 w-full focus:outline-none"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </label>
          </div>
        )}
        <div className="flex items-center gap-4 justify-center mt-4">
          <button
            type="button"
            disabled={loading || (dependents !== null && typed !== CONFIRM_WORD)}
            onClick={() => submit(dependents !== null)}
            className="bg-warning text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Deleting..." : dependents === null ? "Delete" : "Delete everything"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="border border-gray px-4 py-2 rounded text-[#02273D]"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForceDeleteDialog;
