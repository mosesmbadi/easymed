/**
 * Pack display helpers.
 *
 * Stock is always stored in an item's base unit. Anything bigger is an entry in
 * the item's `unit_conversions`, each carrying how many base units it holds, so
 * a box of 12 is {name: 'Box', factor_to_base: 12}.
 */

/**
 * The pack to show a quantity in: the sale default if one is flagged,
 * otherwise the largest defined pack. Returns null for items sold loose.
 */
export function displayPack(item) {
  const packs = item?.unit_conversions ?? [];
  if (packs.length === 0) return null;
  return (
    packs.find((p) => p.is_sale_default) ??
    packs.reduce((biggest, p) =>
      p.factor_to_base > biggest.factor_to_base ? p : biggest
    )
  );
}

/**
 * Format a stock quantity showing both base units and pack breakdown.
 *
 * @param {object} item           - Item carrying `unit_conversions`
 * @param {number} quantityAtHand - Quantity in base units
 * @returns {string}  e.g. "60 units (3 Box of 20 + 5 loose)"
 */
export function formatPackQuantity(item, quantityAtHand) {
  const qty = parseInt(quantityAtHand) || 0;
  const pack = displayPack(item);

  if (!pack) {
    return `${qty} units`;
  }

  const packs = Math.floor(qty / pack.factor_to_base);
  const loose = qty % pack.factor_to_base;
  const looseStr = loose > 0 ? ` + ${loose} loose` : "";

  return `${qty} units (${packs} ${pack.name} of ${pack.factor_to_base}${looseStr})`;
}

/**
 * Price of every unit an item is sold in.
 *
 * Only the base-unit row is a real price: the price list (ItemPrice) holds one
 * sale price per item and has no pack dimension. Every pack row is this base
 * price multiplied out, which is NOT what a pack really costs -- packs are
 * normally discounted per unit. Those rows carry `isDerived` so the UI can say
 * so rather than passing arithmetic off as a price someone set.
 *
 * @param {object} item      - Item carrying `unit_conversions` and `units_of_measure`
 * @param {number} basePrice - Price of ONE base unit
 * @returns {Array<{label: string, factor: number, price: number, isDefault: boolean, isDerived: boolean}>}
 */
export function formatPackPricing(item, basePrice) {
  const price = parseFloat(basePrice) || 0;
  const baseUnit = item?.units_of_measure || "unit";
  const packs = item?.unit_conversions ?? [];

  const rows = [
    { label: baseUnit, factor: 1, price, isDefault: false, isDerived: false },
  ];
  packs.forEach((pack) => {
    rows.push({
      label: pack.name,
      factor: pack.factor_to_base,
      price: price * pack.factor_to_base,
      isDefault: !!pack.is_sale_default,
      isDerived: true,
    });
  });
  return rows;
}

/**
 * Convert a pack quantity entered by staff into base units.
 *
 * @param {number} packs - Number of packs received
 * @param {object} pack  - A unit_conversions entry, or null for base units
 */
export function packsToUnits(packs, pack) {
  const factor = parseInt(pack?.factor_to_base) || 1;
  return (parseInt(packs) || 0) * factor;
}

/**
 * Convert base units to whole packs (floor division).
 *
 * @param {number} units - Quantity in base units
 * @param {object} pack  - A unit_conversions entry, or null for base units
 */
export function unitsToPacks(units, pack) {
  const factor = parseInt(pack?.factor_to_base) || 1;
  return Math.floor((parseInt(units) || 0) / factor);
}

/**
 * Check whether a stock level is at or below the re-order level.
 *
 * @param {object} inventory - Inventory record with quantity_at_hand and re_order_level
 * @returns {boolean}
 */
export function isAtReorderLevel(inventory) {
  const qty = parseInt(inventory?.quantity_at_hand) || 0;
  const reorder = parseInt(inventory?.re_order_level) || 5;
  return qty <= reorder;
}
