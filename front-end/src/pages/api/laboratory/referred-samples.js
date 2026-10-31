import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

// The body is streamed through untouched: a consignment can carry the
// scanned request form as multipart.
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (!req.headers?.authorization) {
        return res.status(401).send('Unauthorized');
    }
    try {
        if (req.method === API_METHODS.GET) {
            const response = await backendAxiosInstance.get(API_URL.REFERRED_SAMPLES, {
                headers: { 'Authorization': req.headers.authorization },
                params: req.query,
            });
            return res.status(200).json(response.data);
        }
        if (req.method === API_METHODS.POST) {
            const response = await backendAxiosInstance.post(API_URL.REFERRED_SAMPLES, req, {
                headers: {
                    'Authorization': req.headers.authorization,
                    'Content-Type': req.headers['content-type'],
                    'Content-Length': req.headers['content-length'],
                },
                maxBodyLength: Infinity,
            });
            return res.status(201).json(response.data);
        }
        return res.status(404).json({ message: 'path not found!' });
    } catch (e) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? { message: e.message });
    }
}
