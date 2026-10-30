import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";
import path from 'path';
import fs from 'fs/promises';

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

            const config = {
                responseType: 'arraybuffer',
            };

            const response = await backendAxiosInstance.get(`${API_URL.SALE_BY_DATE_RANGE_PDF}`, config);

            // Save the PDF file to the public directory
            const filePath = path.join(process.cwd(), 'public', `sale_by_date.pdf`);
            console.log("PATH",filePath)
            await fs.writeFile(filePath, response.data, 'binary');
            

            // Send the link to the PDF file as a response to the client
            const publicURL = `/sale_by_date.pdf`;
            res.status(200).json({ link: publicURL });

        } catch (e) {
            res.status(500).json(e.message);
        }
    } else {
        res.status(404).json({ message: 'path not found!' });
    }
}
