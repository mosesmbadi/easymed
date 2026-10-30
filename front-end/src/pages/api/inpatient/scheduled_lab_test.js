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
    if (req.method === API_METHODS.PATCH) {
        try {
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            const query = req.query;
            const body = req.body;
            let url = `${API_URL.ADMITTED_PATIENT_SCHEDULES}`;

            // Note: The previous one was ADMITTED_PATIENT_SCHEDULED_DRUGS pointing to /inpatient/patient-admissions/
            // The URL structure in backend is ../patient-admissions/{admission_pk}/scheduled_lab_test/
            
            // Wait, let's check api-endpoints.js again for backend URLs
            
            await backendAxiosInstance.patch(`${url}${query.admission_id}/scheduled_lab_test/${query.scheduled_id}/`, body, config).then(response => {
                res.status(200).json(response.data);

            }).catch(e => {
                    res.status(e.response?.status ?? 500).json(e.response?.data)
                }
            )

        } catch (e) {
            res.status(500).json(e.message);
        }
    } else if (req.method === API_METHODS.POST) {
        try {
            const config = {
                headers: {
                    'Authorization': req.headers.authorization,
                }
            };

            const query = req.query;
            const body = req.body;
            let url = `${API_URL.ADMITTED_PATIENT_SCHEDULES}`;

            await backendAxiosInstance.post(`${url}${query.admission_id}/scheduled_lab_test/`, body, config).then(response => {
                res.status(201).json(response.data);
            }).catch(e => {
                res.status(e.response?.status ?? 500).json(e.response?.data)
            })

        } catch (e) {
            res.status(500).json(e.message);
        }
    }
    else {
        res.status(404).json({message: 'path not found!'});
    }
}
