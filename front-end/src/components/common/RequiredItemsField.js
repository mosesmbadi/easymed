import React, { useState } from "react";
import Select from "react-select";
import { Grid } from "@mui/material";
import { AiFillDelete } from "react-icons/ai";

/**
 * Stages the inventory items a thing is built out of, so they are saved in the
 * same action as the thing itself.
 *
 * Used twice, for the two halves of what a lab test costs: the reagents a
 * Test Panel burns on every run, and the syringes and tubes a Specimen uses on
 * every draw. They are deliberately separate lists -- a reagent is spent per
 * test, a syringe per sample -- so this component is parameterised rather than
 * duplicated.
 *
 * Rows live in the parent, each shaped
 *   { [valueKey]: <item id>, name, [quantityKey]: <n>, is_required?,
 *     available_quantity? }
 * `available_quantity` only comes back from the server, so it is blank while a
 * row is still being staged and the column stays hidden.
 */
const RequiredItemsField = ({
  title,
  description,
  options,
  rows,
  setRows,
  valueKey = "item",
  quantityKey = "quantity",
  quantityLabel = "Qty",
  itemLabel = "Item",
  placeholder = "Search...",
  addLabel = "Add",
  emptyLabel = "Nothing added yet.",
  showRequired = true,
  idPrefix = "required-item",
}) => {
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [required, setRequired] = useState(true);
  const [error, setError] = useState("");

  const showStock = rows.some((row) => row.available_quantity != null);

  // One line per item -- the backend holds these unique per parent -- so an
  // item already staged drops out of the picker.
  const unusedOptions = options.filter(
    (option) => !rows.some((row) => row[valueKey] === option.value)
  );

  const addRow = () => {
    if (!selected) {
      setError(`Select a${/^[aeiou]/i.test(itemLabel) ? "n" : ""} ${itemLabel.toLowerCase()}`);
      return;
    }
    const parsed = parseInt(quantity);
    if (!parsed || parsed < 1) {
      setError("Quantity must be at least 1");
      return;
    }
    setError("");
    setRows([
      ...rows,
      {
        [valueKey]: selected.value,
        name: selected.label,
        [quantityKey]: parsed,
        is_required: showRequired ? required : true,
      },
    ]);
    setSelected(null);
    setQuantity("1");
    setRequired(true);
  };

  const removeRow = (id) => setRows(rows.filter((row) => row[valueKey] !== id));

  const patchRow = (id, patch) =>
    setRows(rows.map((row) => (row[valueKey] === id ? { ...row, ...patch } : row)));

  // Blanking the box while typing is fine; leaving it empty is not.
  const normaliseQuantity = (id, value) => {
    const parsed = parseInt(value);
    patchRow(id, { [quantityKey]: !parsed || parsed < 1 ? 1 : parsed });
  };

  return (
    <div>
      {title && <h3 className="font-bold">{title}</h3>}
      {description && <p className="mb-3 text-sm text-gray">{description}</p>}

      <Grid container spacing={2} alignItems="flex-end">
        <Grid item md={showRequired ? 5 : 7} xs={12}>
          <label htmlFor={`${idPrefix}-select`}>{itemLabel}</label>
          <Select
            inputId={`${idPrefix}-select`}
            isSearchable
            isClearable
            placeholder={placeholder}
            value={selected}
            onChange={(option) => {
              setSelected(option);
              setError("");
            }}
            options={unusedOptions}
          />
        </Grid>
        <Grid item md={2} xs={6}>
          <label htmlFor={`${idPrefix}-qty`}>{quantityLabel}</label>
          <input
            id={`${idPrefix}-qty`}
            className="block border border-gray py-2 px-4 focus:outline-none w-full"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onKeyDown={(e) => {
              // This sits inside a bigger form; Enter here means "stage this
              // line", not "submit the whole thing".
              if (e.key === "Enter") {
                e.preventDefault();
                addRow();
              }
            }}
          />
        </Grid>
        {showRequired && (
          <Grid item md={2} xs={6}>
            <label className="flex items-center gap-2 pb-2" htmlFor={`${idPrefix}-required`}>
              <input
                id={`${idPrefix}-required`}
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <span className="text-sm">Required</span>
            </label>
          </Grid>
        )}
        <Grid item md={3} xs={12}>
          <button
            type="button"
            onClick={addRow}
            className="border border-primary text-primary px-4 py-2 w-full"
          >
            {addLabel}
          </button>
        </Grid>
      </Grid>

      {error && <p className="text-warning text-xs mt-1">{error}</p>}

      {rows.length === 0 ? (
        <p className="text-xs text-gray-500 mt-3">{emptyLabel}</p>
      ) : (
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-left border-b border-gray">
              <th className="py-2">{itemLabel}</th>
              <th className="py-2 w-32">{quantityLabel}</th>
              {showRequired && <th className="py-2 w-28">Required</th>}
              {showStock && <th className="py-2 w-28">In stock</th>}
              <th className="py-2 w-12" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[valueKey]} className="border-b border-gray">
                <td className="py-2">{row.name}</td>
                <td className="py-2">
                  <input
                    className="border border-gray py-1 px-2 w-24"
                    type="number"
                    min="1"
                    value={row[quantityKey]}
                    onChange={(e) =>
                      patchRow(row[valueKey], { [quantityKey]: e.target.value })
                    }
                    onBlur={(e) => normaliseQuantity(row[valueKey], e.target.value)}
                  />
                </td>
                {showRequired && (
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={!!row.is_required}
                      onChange={(e) =>
                        patchRow(row[valueKey], { is_required: e.target.checked })
                      }
                    />
                  </td>
                )}
                {showStock && (
                  <td
                    className={`py-2 ${
                      row.available_quantity != null &&
                      row.available_quantity < row[quantityKey]
                        ? "text-warning font-semibold"
                        : ""
                    }`}
                  >
                    {row.available_quantity ?? "—"}
                  </td>
                )}
                <td className="py-2">
                  <AiFillDelete
                    className="text-warning cursor-pointer"
                    onClick={() => removeRow(row[valueKey])}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default RequiredItemsField;
