import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";
// Refactored: stream PDF bytes to client instead of writing to public/download.pdf

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb' // Set desired value here
        }
    }
}

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            if (!req.headers?.authorization) {
                res.status(401).send('Unauthorized');
            }

            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                },
                responseType: 'arraybuffer',
            };

            const body = req.query;

            const response = await backendAxiosInstance.get(`${API_URL.DOWNLOAD_RESULT_PDF}${body.item_name}/${body.item_id}`, {
                ...config,
                responseType: 'arraybuffer'
            });

            res.setHeader('Content-Type', 'application/pdf');
            const filename = `${body.item_name || 'lab_result'}.pdf`;
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.status(200).send(Buffer.from(response.data));

        } catch (e) {
            res.status(500).json({ message: e.message || 'Failed to fetch PDF' });
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}
