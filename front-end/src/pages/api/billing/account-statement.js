import { API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
  api: {
    responseLimit: false,
  }
}

// A credit account's statement: JSON, or the PDF with ?download=pdf.
export default async function handler(req, res) {
  if (req.method !== API_METHODS.GET) {
    return res.status(404).json({ message: 'path not found!' });
  }
  if (!req.headers?.authorization) {
    return res.status(401).send('Unauthorized');
  }
  const { id, start, end, download } = req.query;
  if (!id) {
    return res.status(400).json({ message: 'id is required' });
  }
  const pdf = download === 'pdf';
  const cfg = {
    headers: { 'Authorization': req.headers.authorization },
    params: { start, end, download },
    ...(pdf ? { responseType: 'arraybuffer' } : {}),
  };
  try {
    const response = await backendAxiosInstance.get(`/billing/accounts/${id}/statement/`, cfg);
    if (!pdf) {
      return res.status(200).json(response.data);
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=statement_${id}.pdf`);
    res.status(200).send(Buffer.from(response.data, 'binary'));
  } catch (e) {
    const data = e.response?.data;
    // An error on the PDF request comes back as bytes too.
    const body = data instanceof ArrayBuffer || Buffer.isBuffer(data)
      ? Buffer.from(data).toString('utf8') : data;
    res.status(e.response?.status ?? 500).json(body ?? { message: e.message });
  }
}
