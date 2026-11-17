import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import { Formik, Form } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { toast } from 'react-toastify'
import { useAuth } from '@/assets/hooks/use-auth';
import { updateLabTestProfile } from "@/redux/service/laboratory";
import { getAllLabTestProfiles } from "@/redux/features/laboratory";
import ProfileFields, { profilePayload, profileValidation } from "./ProfileFields";

const EditTestProfileModal = ({ open, setOpen, selectedRowData }) => {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth();
  const { labTestProfiles } = useSelector((store) => store.laboratory);

  const handleClose = () => {
    setOpen(false);
  };

  const initialValues = {
    name: selectedRowData?.name || "",
    parent: selectedRowData?.parent ?? "",
    sort_order: selectedRowData?.sort_order ?? 0,
    sale_price: selectedRowData?.item ? selectedRowData?.sale_price ?? "" : "",
    orders_as_whole: Boolean(selectedRowData?.orders_as_whole),
  };

  // Not itself, and nothing nested under it, which the server refuses too.
  const selfPath = selectedRowData?.full_name;
  const parents = labTestProfiles.filter(
    (profile) =>
      profile.id !== selectedRowData?.id &&
      !(selfPath && (profile.full_name || "").startsWith(`${selfPath} > `))
  );

  const updateAProfile = async (formValue) => {
    try {
      setLoading(true);
      await updateLabTestProfile(parseInt(selectedRowData?.id), profilePayload(formValue), auth)
      // Editing can move sub profiles and rename their paths, so reload the tree.
      dispatch(getAllLabTestProfiles(auth));
      toast.success("Profile Updated Successfully!");
      handleClose();
    } catch (err) {
      toast.error(typeof err === 'string' ? err : "Could not update the profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <Dialog fullWidth maxWidth="md" open={open} onClose={handleClose}>
        <DialogContent>
          <h2 className='my-6 font-bold text-xl'>Edit Profile</h2>
          <Formik
            enableReinitialize
            initialValues={initialValues}
            validationSchema={profileValidation}
            onSubmit={updateAProfile}
          >
            <Form>
              <ProfileFields parents={parents} />
              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary px-4 py-2 text-white disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Update"}
                </button>
              </div>
            </Form>
          </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default EditTestProfileModal;
