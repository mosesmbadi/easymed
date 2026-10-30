import React, { useCallback, useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import { toast } from "react-toastify";
import { AiFillDelete } from "react-icons/ai";

import { useAuth } from "@/assets/hooks/use-auth";
import {
  createItemUnit,
  deleteItemUnit,
  fetchItemUnits,
  updateItemUnit,
} from "@/redux/service/inventory";

const errorText = (err, fallback) => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  const first = Object.values(data)[0];
  return Array.isArray(first) ? first[0] : String(first ?? fallback);
};

const ManageItemUnits = ({ open, setOpen, selectedRowData }) => {
  const auth = useAuth();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  const itemId = selectedRowData?.id;
  const baseUnit = selectedRowData?.units_of_measure || "unit";

  const handleClose = () => setOpen(false);

  const loadUnits = useCallback(async () => {
    if (!itemId) return;
    try {
      const data = await fetchItemUnits(itemId, auth);
      setUnits(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) {
      toast.error(errorText(err, "Could not load pack sizes"));
    }
  }, [itemId, auth]);

  useEffect(() => {
    if (open && auth) loadUnits();
  }, [open, itemId]);

  const initialValues = { name: "", factor_to_base: "" };

  const validationSchema = Yup.object().shape({
    name: Yup.string().required("Name the pack, e.g. Box"),
    factor_to_base: Yup.number()
      .typeError("Must be a number")
      .min(2, "A pack holds more than one base unit")
      .required("Field is required"),
  });

  const addUnit = async (values, helpers) => {
    setLoading(true);
    try {
      await createItemUnit(
        {
          item: itemId,
          name: values.name,
          factor_to_base: parseInt(values.factor_to_base),
        },
        auth
      );
      helpers.resetForm();
      await loadUnits();
      toast.success("Pack size added");
    } catch (err) {
      toast.error(errorText(err, "Could not add pack size"));
    }
    setLoading(false);
  };

  const patchUnit = async (unit, payload, successMessage) => {
    try {
      await updateItemUnit(unit.id, payload, auth);
      await loadUnits();
      toast.success(successMessage);
    } catch (err) {
      toast.error(errorText(err, "Could not update pack size"));
    }
  };

  const saveFactor = (unit, value) => {
    const factor = parseInt(value);
    if (!factor || factor === unit.factor_to_base) return;
    patchUnit(unit, { factor_to_base: factor }, "Pack size updated");
  };

  const removeUnit = async (unit) => {
    try {
      await deleteItemUnit(unit.id, auth);
      await loadUnits();
      toast.success("Pack size removed");
    } catch (err) {
      toast.error(errorText(err, "Could not remove pack size"));
    }
  };

  return (
    <section>
      <Dialog fullWidth maxWidth="md" open={open} onClose={handleClose}>
        <DialogContent>
          <h2 className="mt-4 font-bold text-xl">
            Pack sizes for {selectedRowData?.name}
          </h2>
          <p className="mb-8 text-sm text-gray">
            Stock is counted in <strong>{baseUnit}</strong>. Add a row for every
            bigger container you buy or sell in, and say how many {baseUnit} it
            holds -- a box of 12 is 12. Receiving 3 of that box puts 36 in stock
            and costs them at a twelfth of the box price each.
          </p>

          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={addUnit}
          >
            <Form>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item md={5} xs={12}>
                  <label htmlFor="name">Pack name</label>
                  <Field
                    className="block border border-gray py-2 px-4 focus:outline-none w-full"
                    type="text"
                    placeholder="Box"
                    name="name"
                  />
                  <ErrorMessage
                    name="name"
                    component="div"
                    className="text-warning text-xs"
                  />
                </Grid>
                <Grid item md={4} xs={12}>
                  <label htmlFor="factor_to_base">{baseUnit} per pack</label>
                  <Field
                    className="block border border-gray py-2 px-4 focus:outline-none w-full"
                    type="number"
                    min="2"
                    placeholder="12"
                    name="factor_to_base"
                  />
                  <ErrorMessage
                    name="factor_to_base"
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
                    {loading ? "Adding..." : "Add Pack Size"}
                  </button>
                </Grid>
              </Grid>
            </Form>
          </Formik>

          <table className="w-full my-8 text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="text-left py-2 px-4">Pack</th>
                <th className="text-left py-2 px-4">{baseUnit} per pack</th>
                <th className="text-center py-2 px-4">Default on receiving</th>
                <th className="text-center py-2 px-4">Default on issuing</th>
                <th className="py-2 px-4"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray">
                <td className="py-2 px-4">{baseUnit} (base)</td>
                <td className="py-2 px-4">1</td>
                <td className="py-2 px-4 text-center">
                  {units.some((u) => u.is_purchase_default) ? "" : "Yes"}
                </td>
                <td className="py-2 px-4 text-center">
                  {units.some((u) => u.is_sale_default) ? "" : "Yes"}
                </td>
                <td className="py-2 px-4"></td>
              </tr>
              {units.map((unit) => (
                <tr key={unit.id} className="border-b border-gray">
                  <td className="py-2 px-4">{unit.name}</td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      min="2"
                      defaultValue={unit.factor_to_base}
                      onBlur={(e) => saveFactor(unit, e.target.value)}
                      className="border border-gray py-1 px-2 w-24 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={unit.is_purchase_default}
                      onChange={(e) =>
                        patchUnit(
                          unit,
                          { is_purchase_default: e.target.checked },
                          "Receiving default updated"
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-4 text-center">
                    <input
                      type="checkbox"
                      checked={unit.is_sale_default}
                      onChange={(e) =>
                        patchUnit(
                          unit,
                          { is_sale_default: e.target.checked },
                          "Issuing default updated"
                        )
                      }
                    />
                  </td>
                  <td className="py-2 px-4 text-right">
                    <AiFillDelete
                      onClick={() => removeUnit(unit)}
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

export default ManageItemUnits;
