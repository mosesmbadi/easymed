import { code128Svg } from "@/utils/barcode";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const patientName = (patient) =>
  patient?.display_name || [patient?.first_name, patient?.second_name].filter(Boolean).join(" ");

/**
 * Prints a sticker for a sample tube: the patient's number, name, gender and
 * age, the sample's ID and type, and a barcode of the sample ID. The barcode
 * holds only the sample ID -- that is what a scanner looks the sample up by,
 * and a longer code would be too dense to scan at label size.
 *
 * Sized for a 50mm x 25mm label; the printer's own label size is set in its
 * print dialog.
 */
export const printSampleLabel = (sample, patient) => {
  const sampleId = sample?.patient_sample_code ?? "";
  const win = window.open("", "_blank", "width=420,height=320");
  if (!win) return false;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Sample label ${escapeHtml(sampleId)}</title>
<style>
  @page { size: 50mm 25mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; }
  .label { width: 50mm; height: 25mm; padding: 1.5mm 2mm; overflow: hidden;
           display: flex; flex-direction: column; justify-content: space-between; }
  .row { display: flex; justify-content: space-between; gap: 2mm;
         font-size: 7pt; line-height: 1.2; white-space: nowrap; }
  .row span { overflow: hidden; text-overflow: ellipsis; }
  .name { font-size: 8pt; font-weight: bold; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis; }
  .code { text-align: center; font-size: 7pt; font-weight: bold; letter-spacing: 0.5px; }
</style>
</head>
<body>
  <div class="label">
    <div class="row"><span>PID: ${escapeHtml(patient?.unique_id)}</span><span>${escapeHtml(sample?.specimen_name)}</span></div>
    <div class="name">${escapeHtml(patientName(patient))}</div>
    <div class="row"><span>Gender: ${escapeHtml(patient?.gender)}</span><span>Age: ${escapeHtml(patient?.age)}</span></div>
    ${code128Svg(sampleId, { height: "8mm" })}
    <div class="code">${escapeHtml(sampleId)}</div>
  </div>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`);
  win.document.close();
  return true;
};
