import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
  const id = Number(req.query.id);
  if (req.method !== "GET" || !Number.isInteger(id)) {
    res.status(404).json({ message: "path not found!" });
    return;
  }
  try {
    const { data } = await backendAxiosInstance.get(`/inventory/supplier-invoice/${id}/details/`, {
      headers: { Authorization: req.headers.authorization },
    });
    res.status(200).json(data);
  } catch (e) {
    res.status(e.response?.status ?? 500).json(e.response?.data ?? { detail: e.message });
  }
}
