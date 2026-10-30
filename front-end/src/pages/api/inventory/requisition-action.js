import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

// Ending a requisition, or undoing that. Whitelisted rather than passed
// through, so this cannot be used to reach any other route.
const ALLOWED_ACTIONS = ["reject", "cancel", "reopen"];

export default async function handler(req, res) {
    if (req.method !== API_METHODS.POST) {
        res.status(404).json({ message: 'path not found!' });
        return;
    }

    if (!req.headers?.authorization) {
        res.status(401).send('Unauthorized');
        return;
    }

    const { requisition_id, action } = req.query;

    if (!requisition_id || !ALLOWED_ACTIONS.includes(action)) {
        res.status(400).json({ message: 'Unknown requisition action' });
        return;
    }

    try {
        const config = {
            headers: {
                'Authorization': req.headers.authorization,
            }
        };

        await backendAxiosInstance
            .post(`${API_URL.REQUISITION}${requisition_id}/${action}/`, req.body, config)
            .then(response => {
                res.status(200).json(response.data);
            })
            .catch(e => {
                res.status(e.response?.status ?? 500).json(e.response?.data)
            })

    } catch (e) {
        res.status(500).json(e.message);
    }
}
