import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

// One proxy for the analyzer interface: the inbox, its actions and each
// analyzer's test mappings. /api/laboratory/analyzer/<resource>/<id>/<action>
// goes to the backend's /lab/<resource>/<id>/<action>/, for the resources
// below only.
const RESOURCES = {
    'analyzer-messages': API_URL.ANALYZER_MESSAGES,
    'analyzer-results': API_URL.ANALYZER_RESULTS,
    'analyzer-test-mappings': API_URL.ANALYZER_TEST_MAPPINGS,
};

const METHODS = [API_METHODS.GET, API_METHODS.POST, API_METHODS.PATCH, API_METHODS.DELETE];

export default async function handler(req, res) {
    if (!req.headers?.authorization) {
        return res.status(401).send('Unauthorized');
    }
    const { path = [], ...params } = req.query;
    const [resource, ...rest] = path;
    const base = RESOURCES[resource];
    if (!base || !METHODS.includes(req.method) || rest.some((part) => !/^[\w-]+$/.test(part))) {
        return res.status(404).json({ message: 'path not found!' });
    }

    try {
        const response = await backendAxiosInstance.request({
            method: req.method,
            url: rest.length ? `${base}${rest.join('/')}/` : base,
            headers: { 'Authorization': req.headers.authorization },
            params,
            data: [API_METHODS.POST, API_METHODS.PATCH].includes(req.method) ? req.body : undefined,
        });
        if (response.status === 204) {
            return res.status(204).end();
        }
        return res.status(response.status).json(response.data);
    } catch (e) {
        res.status(e.response?.status ?? 500).json(e.response?.data ?? { message: e.message });
    }
}
