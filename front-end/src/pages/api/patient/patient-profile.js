import { API_URL,API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

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
            // if (!req.headers?.authorization){
            //     res.status(401).send('Unauthorized');
            // }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            const userId = req.query.userId;
            if (!userId) {
                return res.status(400).json({ message: 'userId query param is required' });
            }

            // This endpoint is used in two different ways across the app:
            // - sometimes `userId` is actually a Patient.id (e.g. inpatient admission flow)
            // - sometimes it is a CustomUser.id (patient profile flow)
            // We try Patient detail first, then fall back to the user-based profile endpoint.
            try {
                const patientDetail = await backendAxiosInstance.get(`/patients/patients/${userId}/`, config);
                return res.status(200).json(patientDetail.data);
            } catch (e) {
                const statusCode = e.response?.status;
                if (statusCode !== 404) {
                    return res.status(statusCode ?? 500).json(e.response?.data ?? { message: e.message });
                }
            }

            await backendAxiosInstance.get(`/patients/patient-profile/`, {
                ...config,
                params: { userId }
            }).then(response => {
                res.status(200).json(response.data);
            }).catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data)
                }
            )

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else if (req.method === API_METHODS.POST) {
        try {
            // if (!req.headers?.authorization){
            //     res.status(401).send('Unauthorized');
            // }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const body = req.body;
            
            await backendAxiosInstance.post(`${API_URL.CONSULT_PATIENT}`,body,config)
                .then(response => {
                    res.status(200).json(response.data);
                })
                .catch(e => {
                        res.status(e.response?.status ?? 500).json(e.response?.data)
                    }
                )

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else if (req.method === API_METHODS.PUT) {
        try {
            // if (!req.headers?.authorization){
            //     res.status(401).send('Unauthorized');
            // }
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };
            const body = req.body;

            console.log("PATIENT_EDIT_BODY ",body)
            console.log("PATIENT_EDIT_URL ",`${API_URL.EDIT_PATIENT}/${body.id}`)

            await backendAxiosInstance.post(`${API_URL.EDIT_PATIENT}/${body.id}`,body, config).then(response => {
                res.status(200).json(response.data);

            }).catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data)

                }
            )

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else {
        res.status(404).json({message: 'path not found!'});
    }
}