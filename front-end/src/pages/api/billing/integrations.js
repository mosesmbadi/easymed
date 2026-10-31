import { API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

// Which outside services (M-Pesa prompts, eTIMS) this deployment has on.
export default async function handler(req, res) {
  if (req.method !== API_METHODS.GET) {
    return res.status(404).json({ message: 'path not found!' });
  }
  if (!req.headers?.authorization) {
    return res.status(401).send('Unauthorized');
  }
  try {
    const response = await backendAxiosInstance.get('/billing/integrations/', {
      headers: { 'Authorization': req.headers.authorization },
    });
    res.status(200).json(response.data);
  } catch (e) {
    res.status(e.response?.status ?? 500).json(e.response?.data ?? { message: e.message });
  }
}
