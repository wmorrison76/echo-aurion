// src/modules/invoice/utils/generateCakeInvoice.js
import jsPDF from "jspdf";
import "jspdf-autotable";

export const generateCakeInvoice = (order) => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Cake Design Invoice", 20, 20);

  const items = order.items.map((item) => [
    item.name,
    item.quantity,
    `$${item.unitPrice.toFixed(2)}`,
    `$${(item.quantity * item.unitPrice).toFixed(2)}`
  ]);

  const total = items.reduce((acc, item) => acc + parseFloat(item[3].replace("$", "")), 0);

  doc.autoTable({
    head: [["Item", "Qty", "Unit Price", "Subtotal"]],
    body: items,
    startY: 30
  });

  doc.text(`Total: $${total.toFixed(2)}`, 20, doc.lastAutoTable.finalY + 10);

  doc.save(`Invoice_${order.client.name.replace(/\s+/g, "_")}.pdf`);
};

export default generateCakeInvoice;
