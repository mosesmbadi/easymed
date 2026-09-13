import React, { useEffect, useState } from "react";
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Formik, Field, Form, ErrorMessage, useFormikContext } from "formik";
import { Grid } from "@mui/material";
import * as Yup from "yup";
import { addInventory } from "@/redux/service/inventory";
import { useSelector, useDispatch } from "react-redux";
import { getAllItems } from "@/redux/features/inventory";
import { getAllTheDepartments } from "@/redux/features/auth";
import { toast } from "react-toastify";
import SeachableSelect from "@/components/select/Searchable";
import { useAuth } from "@/assets/hooks/use-auth";
import DayTotalsPerPayMode from "../billing/DayTotalsPerPayMode";

/**
 * Quantity and Total, tied to whichever item is selected.
 *
 * Quantity is entered in the item's BASE unit -- two boxes of twelve gloves is
 * 24, not 2 -- so the label says which unit that is rather than leaving the
 * person at the keyboard to guess. Total is what the system will hold once
 * this entry is saved: what is already on hand plus what is being added, so it
 * is derived, never typed.
 */
const QuantityAndTotal = ({ items = [] }) => {
  const { values, setFieldValue } = useFormikContext();

  // The item list arrives asynchronously, so this renders before it lands.
  const selected = items.find((i) => i.id === values.item?.value);
  const baseUnit = selected?.units_of_measure ?? "base units";
  const onHand = Number(selected?.quantity_at_hand ?? 0);
  const added = parseInt(values.quantity_at_hand) || 0;
  const total = onHand + added;

  // Kept in the payload for the API, but never typed into.
  useEffect(() => {
    if (values.total_quantity !== total) {
      setFieldValue("total_quantity", total, false);
    }
  }, [total]);

  return (
    <>
      <Grid className='my-2' item md={6} xs={12}>
        <label htmlFor="quantity_at_hand">
          Quantity <span className="text-gray-500">(in {baseUnit} — the base unit)</span>
        </label>
        <Field
          className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
          maxWidth="sm"
          placeholder={`Quantity in ${baseUnit}`}
          name="quantity_at_hand"
          type="number"
          min="1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Count in the base unit, not in packs. Two boxes of gloves with 12 in
          each is <strong>24</strong>, not 2.
        </p>
        <ErrorMessage
          name="quantity_at_hand"
          component="div"
          className="text-warning text-xs"
        />
      </Grid>

      <Grid className='my-2' item md={6} xs={12}>
        <label htmlFor="total_quantity">Total</label>
        <input
          id="total_quantity"
          name="total_quantity"
          readOnly
          disabled
          value={selected ? total : ""}
          placeholder="Select an item first"
          className="block border rounded-md text-sm border-gray bg-gray py-2.5 px-4 w-full cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">
          {selected
            ? `${onHand} ${baseUnit} already in the system + ${added} being added.`
            : "What the system will hold once this entry is saved. Calculated, not entered."}
        </p>
      </Grid>
    </>
  );
};

/**
 * Sale price, but only for something the hospital actually sells.
 *
 * A reagent and a syringe are raw materials: the lab sells the Test Panel
 * assembled out of them, and that is where its price is set. Showing a price
 * box against them invites a number that nothing would ever read.
 */
const SalePriceField = ({ items = [] }) => {
  const { values, setFieldValue } = useFormikContext();

  const selected = items.find((i) => i.id === values.item?.value);
  // Unknown until an item is picked; assume sellable so the field is not
  // mysteriously absent on an empty form.
  const sellable = selected ? selected.is_sellable !== false : true;

  useEffect(() => {
    if (!sellable && values.sale_price !== "") {
      setFieldValue("sale_price", "", false);
    }
  }, [sellable]);

  if (!sellable) {
    return (
      <Grid className='my-2' item md={6} xs={12}>
        <label>Sale Price</label>
        <p className="text-xs text-gray-500 mt-2">
          {selected?.name} is not sold as it stands. A lab reagent or consumable is
          a raw material &mdash; price the <strong>Test Panel</strong> built from it,
          under Lab Settings &gt; Test Panels.
        </p>
      </Grid>
    );
  }

  return (
    <Grid className='my-2' item md={6} xs={12}>
      <label htmlFor="sale_price">Sale Price</label>
      <Field
        className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
        maxWidth="sm"
        placeholder="Sale Price"
        name="sale_price"
      />
      <ErrorMessage
        name="sale_price"
        component="div"
        className="text-warning text-xs"
      />
    </Grid>
  );
};

const AddInventory = () => {

  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const auth = useAuth()
  const router = useRouter()
  const { item } = useSelector((store) => store.inventory);
  const { departments = [] } = useSelector((store) => store.auth);

  const initialValues = {
    quantity_at_hand: "",
    lot_number: "",
    department: "",
    purchase_price: "",
    sale_price: "",
    item: "",
    category_one: "Resale", // Set Resale as default
    total_quantity: "",
    expiry_date: "",
  };

  const validationSchema = Yup.object().shape({
    quantity_at_hand: Yup.string().required("This field is required!"),
    lot_number: Yup.string().required("This field is required!"),
    department: Yup.object().required("This field is required!"),
    purchase_price: Yup.string().required("This field is required!"),
    // Not required: plenty of items -- every reagent and consumable -- have no
    // sale price at all, so the field is not even shown for them.
    sale_price: Yup.string(),
    item: Yup.object().required("This field is required!"),
    category_one: Yup.string().required("This field is required"),
    expiry_date: Yup.string().required("This field is required!"),
  });

  const handleAddInventory = async (formValue, helpers) => {
    try {
      const selected = item.find((i) => i.id === formValue.item?.value);
      const formData = {
        ...formValue,
        item: parseInt(formValue.item.value),
        department: parseInt(formValue.department.value),
        // Omitted, not blanked: the server rejects a price on something it
        // does not consider sellable, and "" is not a price either.
        sale_price:
          selected?.is_sellable === false || formValue.sale_price === ""
            ? null
            : formValue.sale_price,
      };

      setLoading(true);
      await addInventory(formData, auth).then(() => {
        helpers.resetForm();
        toast.success("Inventory Added Successfully!");
        setLoading(false);
        router.push('/dashboard/inventory')
      });
    } catch (err) {
      toast.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    dispatch(getAllTheDepartments(auth));
    dispatch(getAllItems(auth));
  }, []);

  return (
    <section>
      <div className="flex items-center gap-4 mb-8">
        <Link href='/dashboard/inventory'><img className="h-3 w-3" src="/images/svgs/back_arrow.svg" alt="return to inventory"/></Link>
        <h3 className="text-xl"> Add Inventory Item </h3>
      </div>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleAddInventory}
      >
        <Form className="">
          <Grid container spacing={2}>
            <Grid className='my-2' item md={12} xs={12}>
                <SeachableSelect
                  label="Select Item"
                  name="item"
                  options={item.map((item) => ({ value: item.id, label: `${item?.name}` }))}
                />
                <ErrorMessage
                  name="item"
                  component="div"
                  className="text-warning text-xs"
                />
            </Grid>
            <Grid className='my-2' item md={6} xs={12}>
            <label htmlFor="quantity">Category</label>
              <Field
                as="select"
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="category"
                name="category_one"
                type="number"
              >
                <option value="" disabled>Select a category</option>
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
          <SeachableSelect
            label="Select Department"
            name="department"
            options={departments.map((department) => ({ value: department.id, label: `${department?.name}` }))}
          />
          <ErrorMessage
            name="department"
            component="div"
            className="text-warning text-xs"
          />
        </Grid>
            <QuantityAndTotal items={item} />            
            <Grid className='my-2' item md={6} xs={12}>
            <label htmlFor="Purchase-Price">Purchase Price</label>
              <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="Purchase Price"
                name="purchase_price"
              />
              <ErrorMessage
                name="purchase_price"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>
            <SalePriceField items={item} />
            <Grid className='my-2' item md={6} xs={12}>
            <label htmlFor="lot_number">Lot Number</label>
              <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                maxWidth="sm"
                placeholder="Lot Number"
                name="lot_number"
              />
              <ErrorMessage
                name="lot_number"
                component="div"
                className="text-warning text-xs"
              />
            </Grid>

            <Grid className='my-2' item md={6} xs={12}>
            <label htmlFor="expiry_date">Expiry Date</label>
              <Field
                className="block border rounded-md text-sm border-gray py-2.5 px-4 focus:outline-card w-full"
                maxWidth="sm"
                type="date"
                placeholder="expiry date"
                name="expiry_date"
              />
              <ErrorMessage
                name="expiry_date"
                component="div"
                className="text-warning text-xs"
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
                  Add Inventory
                </button>
              </div>
            </Grid>
          </Grid>
        </Form>
      </Formik>
    </section>
  )
}

export default AddInventory