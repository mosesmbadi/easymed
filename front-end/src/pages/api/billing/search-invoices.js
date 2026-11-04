import { backendAxiosInstance } from "@/assets/backend-axios-instance";

// Invoices by patient name or number, for picking one to credit.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(404).json({ message: "path not found!" });
    return;
  }
  try {
    const { data } = await backendAxiosInstance.get("/billing/invoices/", {
      headers: { Authorization: req.headers.authorization },
      params: { search: req.query.search ?? "" },
    });
    res.status(200).json(data.slice(0, 25));
  } catch (e) {
    res.status(e.response?.status ?? 500).json(e.response?.data ?? { detail: e.message });
  }
}
