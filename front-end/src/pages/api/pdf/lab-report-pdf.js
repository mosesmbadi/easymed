import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '1024mb'
        }
    }
}

export default async function handler(req, res) {
    if (req.method === API_METHODS.GET) {
        try {
            if (!req.headers?.authorization) {
                return res.status(401).send('Unauthorized');
            }

            const { type } = req.query;

            const response = await backendAxiosInstance.get(API_URL.PRINT_LAB_REPORT, {
                params: { type },
                headers: {
                    'Authorization': req.headers.authorization,
                },
                responseType: 'arraybuffer'
            });

            res.setHeader('Content-Type', 'application/pdf');
            const filename = `lab_${type}_report.pdf`;
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.status(200).send(Buffer.from(response.data));

        } catch (e) {
            console.error("Lab Report PDF Proxy Error:", e);
            res.status(500).json({ message: e.message || 'Failed to fetch PDF' });
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}
