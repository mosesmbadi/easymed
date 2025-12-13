export default async function handler(req, res) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
  const { receiptId, action } = req.query;

  let url = `${backendUrl}/inventory/supplier-payment-receipts/`;

  if (receiptId) {
    url += `${receiptId}/`;
    if (action === 'print') {
      url += 'print/';
    }
  } else {
    // Add query params for filtering
    const queryParams = new URLSearchParams();
    Object.keys(req.query).forEach(key => {
      if (key !== 'receiptId' && key !== 'action') {
        queryParams.append(key, req.query[key]);
      }
    });
    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Authorization': req.headers.authorization || '',
        'Content-Type': 'application/json',
      },
    });

    // Handle PDF response
    if (action === 'print' && response.ok) {
      const blob = await response.blob();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="supplier_payment_receipt_${receiptId}.pdf"`);
      const buffer = Buffer.from(await blob.arrayBuffer());
      return res.send(buffer);
    }

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in supplier-payment-receipts proxy:', error);
    return res.status(500).json({ 
      detail: 'An error occurred while processing your request',
      error: error.message 
    });
  }
}
