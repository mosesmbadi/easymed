import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import * as Yup from "yup";
import { Formik, Field, Form, ErrorMessage } from "formik";
import { Grid } from "@mui/material";
import { useSelector,useDispatch } from "react-redux";
import { getAllInsurance } from "@/redux/features/insurance";
import { editPatient } from "@/redux/service/patients";
import { toast } from 'react-toastify'
import { getAllPatients } from "@/redux/features/patients";
import SeachableSelect from "@/components/select/Searchable";
import { updateItem, fetchItems, fetchUnits } from "@/redux/service/inventory";
import ItemConsumablesField, { usesItemAccompaniments } from "./ItemConsumablesField";
import { useFormikContext } from "formik";

// The section only applies to some categories, and the category is a field of
// this same form, so it has to read from Formik rather than be passed in.
const ItemConsumablesSection = (props) => {
  const { values } = useFormikContext();
  return <ItemConsumablesField category={values.category?.value} {...props} />;
};
import { useAuth } from '@/assets/hooks/use-auth';
import { updateAnItem } from "@/redux/features/inventory";
const EditItemModal = ({ open, setOpen, selectedRowData }) => {
  const [loading, setLoading] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);
  const [consumableOptions, setConsumableOptions] = useState([]);
  const [consumableRows, setConsumableRows] = useState([]);
  const [hasConsumables, setHasConsumables] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth();

    const categories = [
        {value: 'SurgicalEquipment', label: 'Surgical Equipment'},
        {value: 'LabReagent', label: 'Lab Reagent'},
        {value: 'LabConsumable', label: 'Lab Consumable'},
        {value: 'Drug', label: 'Drug'},
        {value: 'Furniture', label: 'Furniture'},
        {value: 'Lab Test', label: 'Lab Test'},
        {value: 'General Appointment', label: 'General Appointment'},
        {value: 'Specialized Appointment', label: 'Specialized Appointment'},
        {value: 'general', label: 'general'},
    ]

    useEffect(() => {
        if (!auth?.token) return;
        fetchUnits(auth).then((data) => {
            const results = Array.isArray(data) ? data : (data?.results ?? []);
            setUnitOptions(results.map((u) => ({ value: u.id, label: `${u.symbol} — ${u.name}` })));
        }).catch(() => {});

        fetchItems(auth).then((data) => {
            const results = Array.isArray(data) ? data : (data?.results ?? []);
            setConsumableOptions(
                results
                    .filter((i) => i.category_one === "Internal" && i.is_stock_tracked)
                    .map((i) => ({ value: i.id, label: `${i.name} (${i.units_of_measure})` }))
            );
        }).catch(() => {});
    }, [auth?.token]);

    // Re-seed the staged rows whenever a different item is opened, so the
    // modal never shows the last item's accompaniments.
    useEffect(() => {
        const links = selectedRowData?.consumables ?? [];
        setConsumableRows(
            links.map((link) => ({
                id: link.id,
                consumable: link.consumable,
                consumable_name: link.consumable_name,
                quantity_per_use: link.quantity_per_use,
                is_required: link.is_required,
            }))
        );
        // An item already holding links plainly has consumables; one holding
        // none opens closed, the same as a brand new item.
        setHasConsumables(links.length > 0);
    }, [selectedRowData?.id]);

    const getCategory = ()=> {
        const category = categories.find((c) => c.value === selectedRowData?.category)
        return category
    }

    const getUnit = ()=> {
        if (!selectedRowData?.units) return null;
        return unitOptions.find((u) => u.value === selectedRowData?.units) ?? null;
    }

  const handleClose = () => {
    setOpen(false);
  };


  const initialValues = {
    item_code: selectedRowData?.item_code || "",
    name: selectedRowData?.name || "",
    category: getCategory() || "",
    units: getUnit() || "",
    units_of_measure: selectedRowData?.units_of_measure || "",
    category_one: selectedRowData?.category_one || "Resale",
    desc: selectedRowData?.desc || "",
  };

  const validationSchema = Yup.object().shape({
    item_code: Yup.string().required("Field is Required!"),
    name: Yup.string().required("Field is Required!"),
    category: Yup.object().required("Field is Required!"),
    units: Yup.object().required("Field is Required!"),
    units_of_measure: Yup.string().trim().required("Field is Required!"),
    desc: Yup.string().required("Field is Required!"),
  });

  const handleEditItem = async (formValue, helpers) => {
    const takesAccompaniments = usesItemAccompaniments(formValue.category.value);

    // Checked but empty says nothing either way. Make the user pick one.
    if (takesAccompaniments && hasConsumables && consumableRows.length === 0) {
      toast.error("Add at least one consumable, or uncheck Has Consumables.");
      return;
    }
    const formData = {
        ...formValue,
        category: formValue.category.value,
        category_one: formValue.category_one,
        units: formValue.units.value,
        units_of_measure: formValue.units_of_measure.trim(),
        // Sent whole every time: the server replaces the set, so a row the
        // user deleted here -- or an unchecked box, which clears the lot --
        // is actually deleted there. A lab item always sends the empty list.
        consumable_items: takesAccompaniments && hasConsumables
            ? consumableRows.map((row) => ({
                consumable: row.consumable,
                quantity_per_use: parseInt(row.quantity_per_use) || 1,
                is_required: !!row.is_required,
            }))
            : [],
    };
    try {
      setLoading(true);
      const response = await updateItem(parseInt(selectedRowData?.id), formData, auth)
      dispatch(updateAnItem(response))
      setLoading(false);
      toast.success("Item Updated Successfully!");
      handleClose();

    } catch (err) {
      toast.error(err);
      console.log("EDIT_ERROR ", err);
    }
  };

  return (
    <section>
      <Dialog
        fullWidth
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
        <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleEditItem}
        >
        <Form className="">
            <Grid container spacing={2}>
            <Grid className='my-2' item md={6} xs={12}>
            <label htmlFor="item_code">Item Code</label>
                <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="Item Code"
                name="item_code"
                />
                <ErrorMessage
                name="item_code"
                component="div"
                className="text-warning text-xs"
                />
            </Grid>
            <Grid className='my-2' item md={6} xs={12}>
            <label htmlFor="category_one">Category</label>
                <Field
                as="select"
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                name="category_one"
                >
                <option value="Resale">Resale</option>
                <option value="Internal">Internal (Consumable)</option>
                </Field>
                <ErrorMessage
                name="category_one"
                component="div"
                className="text-warning text-xs"
                />
            </Grid>
            <Grid className='my-2' item md={6} xs={12}>
            <label htmlFor="item_name">Item Name</label>
                <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="Item Name"
                name="name"
                />
                <ErrorMessage
                name="name"
                component="div"
                className="text-warning text-xs"
                />
            </Grid>
            <Grid className='my-2' item md={6} xs={12}>
                <SeachableSelect
                    label="Select Category"
                    name="category"
                    options={categories.map((item) => ({ value: item.value, label: `${item?.label}` }))}
                />
                <ErrorMessage
                    name="category"
                    component="div"
                    className="text-warning text-xs"
                />
            </Grid>
            <Grid className='my-2' item md={6} xs={12}>
                <SeachableSelect
                    label="Select Unit"
                    name="units"
                    options={unitOptions}
                />
                <ErrorMessage
                    name="units"
                    component="div"
                    className="text-warning text-xs"
                />
            </Grid>
            <Grid className='my-2' item md={12} xs={12}>
            <label htmlFor="units_of_measure">Base Unit</label>
                <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                placeholder="tablets, tests, ml, syringes"
                name="units_of_measure"
                />
                <p className="text-xs text-gray-500 mt-1">
                    The smallest unit stock is counted in. Pack sizes (Box, Kit,
                    Carton) are defined separately, so don&apos;t name a pack here.
                </p>
                <ErrorMessage
                name="units_of_measure"
                component="div"
                className="text-warning text-xs"
                />
            </Grid>
            <Grid className='my-2' item md={12} xs={12}>
            <label htmlFor="description">Description</label>
                <Field
                as='textarea'
                rows={4}
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="description"
                name="desc"
                />
                <ErrorMessage
                name="desc"
                component="div"
                className="text-warning text-xs"
                />
            </Grid>
            <Grid className='my-2' item md={12} xs={12}>
                <ItemConsumablesSection
                    itemName={selectedRowData?.name}
                    options={consumableOptions}
                    rows={consumableRows}
                    setRows={setConsumableRows}
                    enabled={hasConsumables}
                    setEnabled={setHasConsumables}
                />
            </Grid>
            <Grid className='my-2' item md={12} xs={12}>
                <div className="flex items-center justify-end">
                <button
                    type="submit"
                    className="bg-primary rounded-xl text-sm px-8 py-2 text-white"
                >
                    {loading && (
                    <svg
                        aria-hidden="true"
                        role="status"
                        className="inline mr-2 w-4 h-4 text-gray-200 animate-spin dark:text-gray-600"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                        ></path>
                        <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="#1C64F2"
                        ></path>
                    </svg>
                    )}
                    Update Item
                </button>
                </div>
            </Grid>
            </Grid>
        </Form>
        </Formik>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default EditItemModal;
