/**
 * Simple HTML Sanitizer
 * Removes potentially dangerous HTML/JS from user input
 * Used to prevent XSS attacks in PDF notes and other user-provided content
 */

const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "style",
  "form",
  "input",
  "button",
  "textarea",
];

const DANGEROUS_ATTRS = [
  "onclick",
  "onload",
  "onerror",
  "onmouseover",
  "onmouseout",
  "onchange",
  "onsubmit",
  "onkeydown",
  "onkeyup",
  "onfocus",
  "onblur",
  "javascript:",
  "data:",
  "vbscript:",
];

/**
 * Sanitize HTML string by removing dangerous tags and attributes
 * @param html - Raw HTML string
 * @returns Sanitized text
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== "string") return "";

  let sanitized = html;

  // Remove script tags and content
  DANGEROUS_TAGS.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, "gi");
    sanitized = sanitized.replace(regex, "");
    // Self-closing tags
    const selfClosing = new RegExp(`<${tag}[^>]*/?>`, "gi");
    sanitized = sanitized.replace(selfClosing, "");
  });

  // Remove dangerous attributes from remaining tags
  DANGEROUS_ATTRS.forEach((attr) => {
    const regex = new RegExp(`\\s${attr}\\s*=\\s*["\']?[^"\'>]*["\']?`, "gi");
    sanitized = sanitized.replace(regex, "");
  });

  // Remove event handlers in attributes
  sanitized = sanitized.replace(
    /\s(on[a-z]+)\s*=\s*["\']?[^"\'>\s]*["\']?/gi,
    "",
  );

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  return sanitized.trim();
}

/**
 * Strip all HTML tags and return plain text
 * @param html - HTML string
 * @returns Plain text
 */
export function stripHTML(html: string): string {
  if (!html || typeof html !== "string") return "";

  return html
    .replace(/<[^>]*>/g, "") // Remove all HTML tags
    .replace(/&nbsp;/g, " ") // Replace HTML entities
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_match, dec) =>
      String.fromCharCode(parseInt(dec, 10)),
    )
    .trim();
}

/**
 * Sanitize plain text for safe display
 * Escapes HTML special characters
 * @param text - Plain text
 * @returns Escaped text safe for HTML display
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== "string") return "";

  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Sanitize user input for safe use in PDF text rendering
 * Removes newlines and dangerous characters while preserving readability
 * @param text - User input text
 * @returns Sanitized text
 */
export function sanitizeTextForPDF(text: string): string {
  if (!text || typeof text !== "string") return "";

  // Remove HTML tags
  let sanitized = stripHTML(text);

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");

  // Normalize whitespace
  sanitized = sanitized
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return sanitized;
}
