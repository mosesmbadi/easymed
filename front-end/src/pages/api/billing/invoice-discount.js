import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
  const { id, amount } = req.body ?? {};
  if (req.method !== "POST" || !Number.isInteger(id)) {
    res.status(404).json({ message: "path not found!" });
    return;
  }
  try {
    const { data } = await backendAxiosInstance.post(
      `/billing/invoices/${id}/discount/`,
      { amount },
      { headers: { Authorization: req.headers.authorization } }
    );
    res.status(200).json(data);
  } catch (e) {
    res.status(e.response?.status ?? 500).json(e.response?.data ?? { detail: e.message });
  }
}
