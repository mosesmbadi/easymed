/**
 * Which inventory items belong in which lab list.
 *
 * The lab builds one sellable thing -- a Test Panel -- out of two kinds of
 * stock, and they are picked in different places:
 *
 *   reagents            spent per test run, declared on the Test Panel
 *   collection items    spent per sample drawn, declared on the Specimen
 *
 * Keeping the two filters here means the create and edit forms for each can
 * never drift apart on what they offer.
 */

/** Syringes, tubes, gloves: internal consumables a draw uses up. */
export const collectionItemOptions = (items = []) =>
  items
    .filter((i) => i.category_one === "Internal" && i.is_stock_tracked)
    .map((i) => ({ value: i.id, label: `${i.name} (${i.units_of_measure})` }));

/** Reagents only -- the backend rejects anything else on a panel. */
export const reagentOptions = (items = []) =>
  items
    .filter((i) => i.category === "LabReagent")
    .map((i) => ({ value: i.id, label: `${i.name} (${i.units_of_measure})` }));
