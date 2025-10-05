import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";
// Refactored: remove filesystem write and stream PDF directly to client
// Dynamic writes to the public folder caused 404s when navigating to /download.pdf
// Instead we proxy the backend PDF response and send the binary to the browser.

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

            const response = await backendAxiosInstance.get(`${API_URL.DOWNLOAD_PDF}${body.item_name}/${body.item_id}`, {
                ...config,
                responseType: 'arraybuffer'
            });

            // Set headers so browser can handle PDF directly
            res.setHeader('Content-Type', 'application/pdf');
            // Force download filename if the caller chooses to create a Blob URL
            const filename = `${body.item_name || 'document'}.pdf`;
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.status(200).send(Buffer.from(response.data));

        } catch (e) {
        // Provide structured error JSON
        res.status(500).json({ message: e.message || 'Failed to fetch PDF' });
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}
