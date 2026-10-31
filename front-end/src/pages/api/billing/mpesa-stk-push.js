import { API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

// POST asks Safaricom to prompt the customer's phone; GET ?id= polls the prompt.
export default async function handler(req, res) {
  if (!req.headers?.authorization) {
    return res.status(401).send('Unauthorized');
  }
  const config = { headers: { 'Authorization': req.headers.authorization } };
  try {
    if (req.method === API_METHODS.POST) {
      const response = await backendAxiosInstance.post('/billing/mpesa/stk-push/', req.body, config);
      return res.status(response.status).json(response.data);
    }
    if (req.method === API_METHODS.GET && req.query.id) {
      const response = await backendAxiosInstance.get(`/billing/mpesa/stk-push/${req.query.id}/`, config);
      return res.status(200).json(response.data);
    }
    return res.status(404).json({ message: 'path not found!' });
  } catch (e) {
    res.status(e.response?.status ?? 500).json(e.response?.data ?? { message: e.message });
  }
}
