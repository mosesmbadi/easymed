import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method === API_METHODS.POST) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send('Unauthorized');
                return;
            }

            const response = await backendAxiosInstance.post(
                `${API_URL.FETCH_ITEMS}import_excel/`,
                req,
                {
                    headers: {
                        'Authorization': req.headers.authorization,
                        'Content-Type': req.headers['content-type'],
                        'Content-Length': req.headers['content-length']
                    }
                }
            );

            res.status(200).json(response.data);

        } catch (e) {
            console.error("Import Error:", e);
            res.status(e.response?.status || 500).json(e.response?.data || { message: e.message });
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}
