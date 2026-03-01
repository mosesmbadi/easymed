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
                responseType: 'arraybuffer',
            };

            const response = await backendAxiosInstance.get(`${API_URL.FETCH_ITEMS}export_excel/`, config);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="items.xlsx"');
            res.status(200).send(Buffer.from(response.data));

        } catch (e) {
            console.error("Export Error:", e);
            res.status(e.response?.status || 500).json({ message: e.message || 'Failed to export items' });
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}
