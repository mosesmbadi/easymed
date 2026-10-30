import React, { useCallback, useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { AiFillDelete } from "react-icons/ai";

import { useAuth } from "@/assets/hooks/use-auth";
import SeachableSelect from "@/components/select/Searchable";
import { getItems } from "@/redux/features/inventory";
import {
  createTestPanelReagent,
  deleteTestPanelReagent,
  fetchTestPanelReagents,
  updateTestPanelReagent,
} from "@/redux/service/laboratory";

const errorText = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  const first = Object.values(data)[0];
  return Array.isArray(first) ? first[0] : String(first ?? fallback);
};

const ManagePanelReagents = ({ open, setOpen, selectedRowData }) => {
  const auth = useAuth();
  const dispatch = useDispatch();
  const { item } = useSelector((store) => store.inventory);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);

  const panelId = selectedRowData?.id;

  const handleClose = () => setOpen(false);

  const loadLinks = useCallback(async () => {
    if (!panelId) return;
    try {
      const data = await fetchTestPanelReagents(panelId, auth);
      setLinks(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) {
      toast.error(errorText(err, "Could not load reagents for this panel"));
    }
  }, [panelId, auth]);

  useEffect(() => {
    if (open && auth) {
      dispatch(getItems(auth));
      loadLinks();
    }
  }, [open, panelId]);

  const reagentOptions = (item ?? [])
    .filter((i) => i.category === "LabReagent")
    .filter((i) => !links.some((link) => link.reagent_item === i.id))
    .map((i) => ({ value: i.id, label: i.name }));

  const initialValues = { reagent_item: "", units_consumed_per_run: 1 };

  const validationSchema = Yup.object().shape({
    reagent_item: Yup.object().required("Select a reagent").nullable(),
    units_consumed_per_run: Yup.number()
      .typeError("Must be a number")
      .min(1, "Must be at least 1")
      .required("Field is required"),
  });

  const addReagent = async (values, helpers) => {
    setLoading(true);
    try {
      await createTestPanelReagent(
        {
          test_panel: panelId,
          reagent_item: values.reagent_item.value,
          units_consumed_per_run: parseInt(values.units_consumed_per_run),
        },
        auth
      );
      helpers.resetForm();
      await loadLinks();
      toast.success("Reagent linked to panel");
    } catch (err) {
      toast.error(errorText(err, "Could not link reagent"));
    }
    setLoading(false);
  };

  const saveQuantity = async (link, value) => {
    const quantity = parseInt(value);
    if (!quantity || quantity === link.units_consumed_per_run) return;
    try {
      await updateTestPanelReagent(link.id, { units_consumed_per_run: quantity }, auth);
      await loadLinks();
      toast.success("Quantity updated");
    } catch (err) {
      toast.error(errorText(err, "Could not update quantity"));
    }
  };

  const removeReagent = async (link) => {
    try {
      await deleteTestPanelReagent(link.id, auth);
      await loadLinks();
      toast.success("Reagent unlinked");
    } catch (err) {
      toast.error(errorText(err, "Could not unlink reagent"));
    }
  };

  return (
    <section>
      <Dialog fullWidth maxWidth="md" open={open} onClose={handleClose}>
        <DialogContent>
          <h2 className="mt-4 font-bold text-xl">
            Reagents for {selectedRowData?.name}
          </h2>
          <p className="mb-8 text-sm text-gray">
            Every reagent listed here is deducted from lab stock each time this
            panel is billed. A CBC, for example, burns diluent, lyse and cleaner
            on every run.
          </p>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={addReagent}
          >
            <Form>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item md={6} xs={12}>
                  <SeachableSelect
                    label="Reagent"
                    name="reagent_item"
                    options={reagentOptions}
                  />
                  <ErrorMessage
                    name="reagent_item"
                    component="div"
                    className="text-warning text-xs"
                  />
                </Grid>
                <Grid item md={3} xs={12}>
                  <label htmlFor="units_consumed_per_run">Units per run</label>
                  <Field
                    className="block border border-gray py-2 px-4 focus:outline-none w-full"
                    type="number"
                    min="1"
                    name="units_consumed_per_run"
                  />
                  <ErrorMessage
                    name="units_consumed_per_run"
                    component="div"
                    className="text-warning text-xs"
                  />
                </Grid>
                <Grid item md={3} xs={12}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary px-4 py-2 text-white w-full"
                  >
                    {loading ? "Adding..." : "Add Reagent"}
                  </button>
                </Grid>
              </Grid>
            </Form>
          </Formik>

          <table className="w-full my-8 text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="text-left py-2 px-4">Reagent</th>
                <th className="text-left py-2 px-4">Code</th>
                <th className="text-left py-2 px-4">Units per run</th>
                <th className="text-left py-2 px-4">In stock</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 px-4 text-center">
                    No reagents linked yet. This panel will not deduct any stock
                    when billed.
                  </td>
                </tr>
              )}
              {links.map((link) => (
                <tr key={link.id} className="border-b border-gray">
                  <td className="py-2 px-4">{link.reagent_name}</td>
                  <td className="py-2 px-4">{link.reagent_code}</td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      min="1"
                      defaultValue={link.units_consumed_per_run}
                      onBlur={(e) => saveQuantity(link, e.target.value)}
                      className="border border-gray py-1 px-2 w-20 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className={
                        link.available_quantity < link.units_consumed_per_run
                          ? "text-warning"
                          : ""
                      }
                    >
                      {link.available_quantity}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <AiFillDelete
                      onClick={() => removeReagent(link)}
                      className="text-warning text-xl cursor-pointer inline"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ManagePanelReagents;
