import { API_URL, API_METHODS } from "@/assets/api-endpoints";
import { backendAxiosInstance } from "@/assets/backend-axios-instance";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "1024mb",
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== API_METHODS.GET) {
        return res.status(405).json({ message: "Method Not Allowed" });
    }

    if (!req.headers?.authorization) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const config = {
        headers: {
            Authorization: req.headers.authorization,
        },
    };

    // The ledger can be sliced by item, location, movement type and date range.
    const params = new URLSearchParams();
    ["item", "department", "lot", "movement_type", "source_type", "occurred_after", "occurred_before", "search"]
        .forEach((key) => {
            if (req.query[key]) params.append(key, req.query[key]);
        });

    const query = params.toString();
    const url = query ? `${API_URL.STOCK_MOVEMENTS}?${query}` : API_URL.STOCK_MOVEMENTS;

    try {
        const response = await backendAxiosInstance.get(url, config);
        res.status(200).json(response.data);
    } catch (error) {
        res.status(error.response?.status ?? 500).json(error.response?.data ?? { message: error.message });
    }
}
