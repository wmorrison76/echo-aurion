import db from "./db-client.js";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.ECHO_OPENAI_API_KEY,
});

/**
 * Retrieve or create producer record with history
 * @param {string} name - Producer/winery name
 * @returns {object} producer data
 */
export async function getProducer(name) {
  try {
    const result = await db.query(
      "SELECT * FROM producers WHERE name ILIKE $1",
      [name],
    );

    if (result.rows && result.rows.length > 0) {
      return result.rows[0];
    }

    return await createProducer(name);
  } catch (error) {
    console.error("Error getting producer:", error);
    throw error;
  }
}

/**
 * Generate AI producer history if missing
 * @param {string} name - Winery/producer name
 * @returns {object} newly created producer
 */
export async function createProducer(name) {
  try {
    const prompt = `Provide a comprehensive yet concise history of the winery/producer "${name}".

Include:
1. Founding date and original founder/family name
2. Historical ownership changes and current ownership structure
3. Primary wine regions and flagship styles
4. Key milestones (expansions, awards, ownership changes)
5. Current philosophy and innovation focus
6. Notable wines and reputation

Write in 200-250 words, authoritative sommelier tone, suitable for education and reference.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 350,
      temperature: 0.7,
    });

    const history = response.choices[0].message.content.trim();

    const result = await db.query(
      `INSERT INTO producers (name, history, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, name, history, created_at`,
      [name, history],
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error creating producer:", error);
    throw error;
  }
}

/**
 * Search producers by name or region
 * @param {string} query - Search term
 * @param {number} limit - Results limit
 * @returns {array} matching producers
 */
export async function searchProducers(query, limit = 20) {
  try {
    const result = await db.query(
      `SELECT id, name, history FROM producers
       WHERE name ILIKE $1 OR history ILIKE $2
       LIMIT $3`,
      [`%${query}%`, `%${query}%`, limit],
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error searching producers:", error);
    return [];
  }
}

/**
 * Get all producers (with pagination)
 * @param {number} limit - Results limit
 * @param {number} offset - Pagination offset
 * @returns {array} producers
 */
export async function getAllProducers(limit = 100, offset = 0) {
  try {
    const result = await db.query(
      `SELECT id, name, history, created_at FROM producers
       ORDER BY name ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error getting all producers:", error);
    return [];
  }
}

/**
 * Update producer information
 * @param {string} name - Producer name
 * @param {object} updates - Fields to update
 * @returns {object} result
 */
export async function updateProducer(name, updates) {
  try {
    const { history } = updates;

    await db.query(
      `UPDATE producers
       SET history = COALESCE($1, history)
       WHERE name ILIKE $2`,
      [history, name],
    );

    return { status: "updated", producer: name };
  } catch (error) {
    console.error("Error updating producer:", error);
    throw error;
  }
}

/**
 * Get notable producers by region
 * @param {string} region - Wine region
 * @param {number} limit - Results limit
 * @returns {array} producers from that region
 */
export async function getProducersByRegion(region, limit = 20) {
  try {
    const result = await db.query(
      `SELECT id, name, history FROM producers
       WHERE history ILIKE $1
       LIMIT $2`,
      [`%${region}%`, limit],
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error getting producers by region:", error);
    return [];
  }
}
