import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const response = await backendAxiosInstance.get(`${API_URL.TRIAGE_SETTINGS}`, config);
            res.status(200).json(response.data);
        } catch (err) {
            console.error(err);
            res.status(500).json(err.response?.data || err.message);
        }
    } else if (req.method === API_METHODS.PATCH) {
        try {
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const body = req.body;
            const response = await backendAxiosInstance.patch(`${API_URL.TRIAGE_SETTINGS}`, body, config);
            res.status(200).json(response.data);
        } catch (err) {
            console.error(err);
            res.status(500).json(err.response?.data || err.message);
        }
    } else {
        res.setHeader("Allow", ["GET", "PATCH"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
