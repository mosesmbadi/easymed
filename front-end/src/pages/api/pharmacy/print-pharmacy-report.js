import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send('Unauthorized');
                return;
            }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                },
                responseType: 'arraybuffer' // Critical for PDF/Binary data
            };

            const { type } = req.query;

            await backendAxiosInstance.get(`${API_URL.PRINT_PHARMACY_REPORT}?type=${type}`, config)
                .then(response => {
                    res.setHeader('Content-Type', 'application/pdf');
                    res.setHeader('Content-Disposition', response.headers['content-disposition'] || 'inline; filename="report.pdf"');
                    res.status(200).send(response.data);
                })
                .catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data);
                });

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else {
        res.status(404).json({ message: 'path not found!' });
    }
}
