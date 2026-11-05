import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(404).json({ message: "path not found!" });
    return;
  }
  try {
    const response = await backendAxiosInstance.get("/inventory/supplier-invoice/report/", {
      headers: { Authorization: req.headers.authorization },
      params: req.query,
      responseType: "arraybuffer",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=supplier_invoices.pdf");
    res.status(200).send(Buffer.from(response.data, "binary"));
  } catch (e) {
    res.status(e.response?.status ?? 500).json({ message: e.message });
  }
}
