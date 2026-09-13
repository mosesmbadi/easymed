import React from "react";
import { useFormikContext } from "formik";

/**
 * The other half of what this test costs: the items its specimen is collected
 * with.
 *
 * Read-only on purpose. The syringe belongs to the draw, not the test -- order
 * three panels off one tube of blood and you still spend one syringe -- so it
 * is edited on the Specimen and only shown here, where somebody setting a
 * sale price needs to see the whole picture.
 */
const PanelCollectionCost = ({ specimens = [] }) => {
  const { values } = useFormikContext();

  const specimenId = values.specimen?.value ?? values.specimen;
  const specimen = specimens.find((s) => s.id === specimenId);

  if (!specimen) {
    return (
      <p className="text-xs text-gray-500">
        Pick a specimen to see what collecting the sample costs.
      </p>
    );
  }

  const rows = specimen.consumables ?? [];

  return (
    <div className="border border-gray rounded-md p-3">
      <h3 className="font-bold text-sm">
        Collected with {specimen.name} &mdash; set on the Specimen
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-500 mt-1">
          Nothing listed against this specimen. Add the syringe, tube or gloves
          under Lab Settings &gt; Specimens so collection deducts them.
        </p>
      ) : (
        <>
          <ul className="text-xs mt-2 space-y-0.5">
            {rows.map((row) => (
              <li key={row.id}>
                {row.quantity_per_collection} x {row.item_name}
                {row.is_required === false && " (optional)"}
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            Deducted once when the sample is collected, shared across every
            panel ordered off it, and not charged again on a retest.
          </p>
        </>
      )}
    </div>
  );
};

export default PanelCollectionCost;
