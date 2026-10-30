import { backendAxiosInstance } from "@/assets/backend-axios-instance";
import { API_URL } from "@/assets/api-endpoints";

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { patient_id } = req.body;
            
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            const response = await backendAxiosInstance.post(
                `${API_URL.AI_TRIAGE_REQUEST}${patient_id}/`,
                {},
                config
            );

            res.status(200).json(response.data);

        } catch (e) {
            res.status(e.response?.status ?? 500).json(e.response?.data ?? { error: 'Failed to start AI analysis' });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}