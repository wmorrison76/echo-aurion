import fs from 'fs';
import path from 'path';

export function exportCakeDesign(req, res) {
  const designData = req.body;
  const exportPath = path.resolve(`./backend/exports/${designData.orderId}_internal_report.json`);

  fs.writeFileSync(exportPath, JSON.stringify(designData, null, 2));

  res.json({ message: 'Internal report generated.', path: exportPath });
}

export function generateCustomerForm(req, res) {
  const formData = req.body;
  const formPath = path.resolve(`./backend/exports/${formData.orderId}_customer_confirmation.txt`);

  const content = `
    Cake Order Confirmation
    Order ID: ${formData.orderId}
    Customer: ${formData.customerName}
    Event Date: ${formData.eventDate}
    Cake Summary: ${formData.summary}

    Thank you for your order!
  `;

  fs.writeFileSync(formPath, content);

  res.json({ message: 'Customer form generated.', path: formPath });
}
