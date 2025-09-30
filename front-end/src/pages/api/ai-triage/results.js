import { backendAxiosInstance } from "@/assets/backend-axios-instance";
import { API_URL } from "@/assets/api-endpoints";

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { patient_id } = req.query;
            
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            const response = await backendAxiosInstance.get(
                `${API_URL.AI_TRIAGE_RESULTS}${patient_id}/`,
                config
            );

            res.status(200).json(response.data);

        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data ?? { error: 'Failed to fetch AI results' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}