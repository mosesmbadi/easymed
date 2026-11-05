import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
  const { id } = req.body ?? {};
  if (req.method !== "POST" || !Number.isInteger(id)) {
    res.status(404).json({ message: "path not found!" });
    return;
  }
  try {
    const { data } = await backendAxiosInstance.post(
      `/billing/account-transfers/${id}/reverse/`,
      {},
      { headers: { Authorization: req.headers.authorization } }
    );
    res.status(201).json(data);
  } catch (e) {
    res.status(e.response?.status ?? 500).json(e.response?.data ?? { detail: e.message });
  }
}
