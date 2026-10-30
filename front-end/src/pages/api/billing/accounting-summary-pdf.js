import { backendAxiosInstance } from "@/assets/hooks/use-axios";

export default async function handler(req, res) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

    // Forward query params
    const queryParams = new URLSearchParams(req.query).toString();
    const url = queryParams
        ? `${backendUrl}/billing/accounting-summary/pdf/?${queryParams}`
        : `${backendUrl}/billing/accounting-summary/pdf/`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': req.headers.authorization || '',
            },
        });

        if (!response.ok) {
            const text = await response.text();
            return res.status(response.status).json({ detail: text || 'Failed to generate PDF' });
        }

        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="accounting_summary.pdf"');
        return res.send(buffer);
    } catch (error) {
        console.error('Error generating accounting summary PDF:', error);
        return res.status(500).json({
            detail: 'An error occurred while generating the PDF',
            error: error.message,
        });
    }
}
