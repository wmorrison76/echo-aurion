function pdfEscapeText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ");
}

function wrapLines(text, maxCharsPerLine) {
  const tokens = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const token of tokens) {
    const next = current ? `${current} ${token}` : token;
    if (next.length <= maxCharsPerLine) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = token;
  }

  if (current) lines.push(current);
  return lines;
}

function buildPdfBuffer(lines, { title = "Document" } = {}) {
  const fontSize = 12;
  const lineHeight = 16;
  const marginLeft = 54;
  const marginTop = 54;
  const pageWidth = 612;
  const pageHeight = 792;

  const contentLines = [];
  contentLines.push("BT");
  contentLines.push(`/F1 ${fontSize} Tf`);
  contentLines.push(`${marginLeft} ${pageHeight - marginTop} Td`);

  const maxLinesPerPage = Math.floor((pageHeight - marginTop * 2) / lineHeight);
  let lineCount = 0;

  for (const line of lines) {
    if (lineCount > 0) {
      contentLines.push(`0 -${lineHeight} Td`);
    }
    contentLines.push(`(${pdfEscapeText(line)}) Tj`);
    lineCount += 1;

    if (lineCount >= maxLinesPerPage) {
      contentLines.push("ET");
      break;
    }
  }

  if (contentLines[contentLines.length - 1] !== "ET") {
    contentLines.push("ET");
  }

  const stream = `${contentLines.join("\n")}\n`;

  const objects = [];

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
  );
  objects.push(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );

  const streamBytes = Buffer.from(stream, "utf8");
  objects.push(
    `5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream\nendobj\n`,
  );

  const header = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets = [0];
  let body = "";
  let cursor = Buffer.byteLength(header, "utf8");

  for (const obj of objects) {
    offsets.push(cursor);
    body += obj;
    cursor += Buffer.byteLength(obj, "utf8");
  }

  const xrefStart = cursor;
  const xrefLines = [];
  xrefLines.push("xref");
  xrefLines.push(`0 ${objects.length + 1}`);
  xrefLines.push("0000000000 65535 f ");

  for (let i = 1; i < offsets.length; i += 1) {
    const off = offsets[i];
    xrefLines.push(`${String(off).padStart(10, "0")} 00000 n `);
  }

  const trailer =
    "trailer\n" + `<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\n`;

  const infoObj = `6 0 obj\n<< /Title (${pdfEscapeText(title)}) /Producer (Fusion Starter) >>\nendobj\n`;

  const xrefAndTrailer =
    `${xrefLines.join("\n")}\n` +
    infoObj +
    trailer +
    `startxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.concat([
    Buffer.from(header, "binary"),
    Buffer.from(body, "utf8"),
    Buffer.from(xrefAndTrailer, "utf8"),
  ]);
}

export class BEOGeneratorService {
  async generateBEOPDF({ beoNumber, eventId, contentData }) {
    const title = `BEO ${beoNumber}`;

    const lines = [];
    lines.push(title);
    lines.push(`Event: ${eventId}`);
    lines.push("");

    if (contentData && typeof contentData === "object") {
      try {
        const json = JSON.stringify(contentData, null, 2);
        const wrapped = wrapLines(json, 92);
        lines.push("Content:");
        lines.push(...wrapped);
      } catch {
        lines.push("Content:");
        lines.push("[unserializable contentData]");
      }
    } else {
      lines.push("Content:");
      lines.push(String(contentData ?? ""));
    }

    return buildPdfBuffer(lines, { title });
  }
}
