import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (req.method !== "GET" || !Number.isInteger(id)) {
    res.status(404).json({ message: "path not found!" });
    return;
  }
  try {
    const response = await backendAxiosInstance.get(`/billing/download_credit_note_pdf/${id}/`, {
      headers: { Authorization: req.headers.authorization },
      responseType: "arraybuffer",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=credit_note_${id}.pdf`);
    res.status(200).send(Buffer.from(response.data, "binary"));
  } catch (e) {
    res.status(e.response?.status ?? 500).json({ message: e.message });
  }
}
