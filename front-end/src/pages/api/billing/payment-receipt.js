import { API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
  api: {
    responseLimit: false,
  }
}

export default async function handler(req, res) {
  if (req.method === API_METHODS.GET) {
    try {
      if (!req.headers?.authorization){
        res.status(401).send('Unauthorized');
        return;
      }
      const { id } = req.query;
      if (!id) {
        res.status(400).json({ message: 'id is required' });
        return;
      }
      const config = {
        headers: {
          'Authorization': req.headers.authorization,
        },
        responseType: 'arraybuffer',
      };

      const response = await backendAxiosInstance.get(`/billing/download_payment_receipt_pdf/${id}/`, config);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=payment_receipt_${id}.pdf`);
      res.status(200).send(Buffer.from(response.data, 'binary'));
    } catch (e) {
      res.status(e.response?.status ?? 500).json(e.response?.data ?? { message: e.message });
    }
  } else {
    res.status(404).json({ message: 'path not found!' });
  }
}
