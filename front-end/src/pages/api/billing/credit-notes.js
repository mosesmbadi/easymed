import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
  const config = { headers: { Authorization: req.headers.authorization } };
  try {
    if (req.method === "GET") {
      const { data } = await backendAxiosInstance.get("/billing/credit-notes/", {
        ...config,
        params: req.query,
      });
      res.status(200).json(data);
    } else if (req.method === "POST") {
      const { data } = await backendAxiosInstance.post("/billing/credit-notes/", req.body, config);
      res.status(201).json(data);
    } else {
      res.status(404).json({ message: "path not found!" });
    }
  } catch (e) {
    res.status(e.response?.status ?? 500).json(e.response?.data ?? { detail: e.message });
  }
}
