import React, { useEffect } from "react";
import { useFormikContext } from "formik";
import SeachableSelect from "@/components/select/Searchable";

/**
 * Picks the pack a requisition line is being ordered in.
 *
 * Options depend on the item chosen above it, so this reads the live form
 * value rather than taking a prop, and resets when the item changes — a box
 * size belonging to a different item must never stick around.
 *
 * @param {array}  items     - Inventory items carrying `unit_conversions`
 * @param {string} itemField - Name of the Formik field holding the selected item
 */
const OrderUnitSelect = ({ items, itemField = "item", name = "item_unit" }) => {
  const { values, setFieldValue } = useFormikContext();
  const selectedItem = items.find((i) => i.id === values[itemField]?.value);
  const baseUnit = selectedItem?.units_of_measure || "unit";

  const options = [
    { value: "", label: `${baseUnit} (base unit)`, factor: 1 },
    ...(selectedItem?.unit_conversions ?? []).map((u) => ({
      value: u.id,
      label: `${u.name} of ${u.factor_to_base} ${baseUnit}`,
      factor: u.factor_to_base,
    })),
  ];

  useEffect(() => {
    const stillValid = options.some((o) => o.value === values[name]?.value);
    if (stillValid) return;
    const purchaseDefault = (selectedItem?.unit_conversions ?? []).find(
      (u) => u.is_purchase_default
    );
    setFieldValue(
      name,
      options.find((o) => o.value === purchaseDefault?.id) || options[0]
    );
  }, [values[itemField]?.value]);

  const factor = values[name]?.factor ?? 1;
  const total = (parseInt(values.quantity_requested) || 0) * factor;

  return (
    <>
      <SeachableSelect label="Order in" name={name} options={options} />
      {factor > 1 && total > 0 && (
        <p className="text-xs text-gray mt-1">
          That is {total} {baseUnit} in total.
        </p>
      )}
    </>
  );
};

export default OrderUnitSelect;
