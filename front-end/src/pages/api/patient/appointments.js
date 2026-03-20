import axios from 'axios';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.20.12:8080';

export default async function handler(req, res) {
  try {
    const { method } = req;
    const url = `${BACKEND_URL}/patients/appointments/`;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    let response;
    if (method === 'GET') {
      response = await axios.get(url, { headers, params: req.query });
    } else if (method === 'POST') {
      response = await axios.post(url, req.body, { headers });
    } else if (method === 'PUT') {
      const { id } = req.query;
      response = await axios.put(`${url}${id}/`, req.body, { headers });
    } else if (method === 'DELETE') {
      const { id } = req.query;
      response = await axios.delete(`${url}${id}/`, { headers });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('APPOINTMENT API ERROR:', error);
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}