// Code 128 (set B) barcodes as inline SVG, so labels print without a library
// or a network call. Set B covers printable ASCII, which is all a sample code
// or patient number uses; anything else is printed as '?'.

// Bar/space widths for each symbol value 0-105, then the stop symbol (106).
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;
const QUIET_ZONE = 10; // modules of white either side, so scanners find the edges

/** The symbol values for `text`: start, data, checksum, stop. */
const code128BValues = (text) => {
  const data = Array.from(String(text ?? "")).map((ch) => {
    const code = ch.charCodeAt(0);
    return code >= 32 && code <= 127 ? code - 32 : "?".charCodeAt(0) - 32;
  });
  const checksum = data.reduce((sum, value, i) => sum + value * (i + 1), START_B) % 103;
  return [START_B, ...data, checksum, STOP];
};

/**
 * An SVG barcode for `text`. It stretches to the width it is given; `height`
 * is any CSS length.
 */
export const code128Svg = (text, { height = "10mm" } = {}) => {
  const widths = code128BValues(text).map((value) => PATTERNS[value]).join("");

  let x = QUIET_ZONE;
  const bars = [];
  Array.from(widths).forEach((w, i) => {
    const width = Number(w);
    // Patterns alternate bar, space, bar... starting with a bar.
    if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${width}" height="1"/>`);
    x += width;
  });
  const total = x + QUIET_ZONE;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} 1" preserveAspectRatio="none" ` +
    `shape-rendering="crispEdges" style="width:100%;height:${height};display:block">` +
    `<rect width="${total}" height="1" fill="#fff"/><g fill="#000">${bars.join("")}</g></svg>`
  );
};
