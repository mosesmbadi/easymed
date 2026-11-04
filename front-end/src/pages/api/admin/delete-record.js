import { backendAxiosInstance } from "@/assets/backend-axios-instance";

const RESOURCES = {
  patient: "/patients/patients",
  item: "/inventory/items",
  stock: "/inventory/stock-balances",
  panel: "/lab/lab-test-panel",
  profile: "/lab/lab-test-profile",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(404).json({ message: "path not found!" });
    return;
  }
  const { resource, id, force } = req.body;
  const path = RESOURCES[resource];
  if (!path || !Number.isInteger(id)) {
    res.status(400).json({ error_message: "Unknown record." });
    return;
  }
  try {
    await backendAxiosInstance.delete(`${path}/${id}/`, {
      headers: { Authorization: req.headers.authorization },
      params: force ? { force: "true" } : {},
    });
    res.status(200).json({ deleted: true });
  } catch (e) {
    res.status(e.response?.status ?? 500).json(e.response?.data ?? { error_message: e.message });
  }
}
