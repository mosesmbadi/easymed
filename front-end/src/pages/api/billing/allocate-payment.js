import { API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}

export default async function handler(req, res) {
  if (req.method === API_METHODS.POST) {
    try {
      if (!req.headers?.authorization){
        res.status(401).send('Unauthorized');
        return;
      }
      const config = {
        headers: {
          'Authorization': req.headers.authorization,
        },
        responseType: 'json',
      };

      const body = req.body;
      const response = await backendAxiosInstance.post(`/billing/allocate-payment/`, body, config);
      res.status(201).json(response.data);
    } catch (e) {
      res.status(e.response?.status ?? 500).json(e.response?.data ?? { message: e.message });
    }
  } else {
    res.status(404).json({ message: 'path not found!' });
  }
}
