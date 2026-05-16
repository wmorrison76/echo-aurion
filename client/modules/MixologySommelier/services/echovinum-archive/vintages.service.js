import db from "./db-client.js";
import OpenAI from "openai";
import { DateTime } from "luxon";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.ECHO_OPENAI_API_KEY,
});

/**
 * Retrieve or create vintage record
 * @param {string} region - Wine region
 * @param {number} year - Vintage year
 * @returns {object} vintage data
 */
export async function getVintage(region, year) {
  try {
    const result = await db.query(
      "SELECT * FROM vintages WHERE region ILIKE $1 AND year = $2",
      [region, year],
    );

    if (result.rows && result.rows.length > 0) {
      return result.rows[0];
    }

    return await createVintage(region, year);
  } catch (error) {
    console.error("Error getting vintage:", error);
    throw error;
  }
}

/**
 * Generate vintage summary using AI if missing
 * @param {string} region - Wine region
 * @param {number} year - Vintage year
 * @returns {object} newly created vintage
 */
export async function createVintage(region, year) {
  try {
    const prompt = `Provide a concise expert summary of the ${year} vintage in ${region}.
Include:
1. Climate conditions (temperature, rainfall, sunshine hours)
2. Yield and quality assessment (1-10 scale)
3. Stylistic characteristics and notable wines
4. Long-term aging potential
Keep to 150 words, professional tone.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.7,
    });

    const summary = response.choices[0].message.content.trim();

    await db.query(
      `INSERT INTO vintages (region, year, summary, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [region, year, summary],
    );

    return {
      region,
      year,
      summary,
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error creating vintage:", error);
    throw error;
  }
}

/**
 * Build a decade overview with AI analysis
 * @param {string} region - Wine region
 * @param {number} decadeStart - Starting year (e.g., 1990)
 * @returns {string} decade summary
 */
export async function summarizeDecade(region, decadeStart) {
  try {
    const decadeEnd = decadeStart + 9;

    const result = await db.query(
      `SELECT year, rating, summary FROM vintages
       WHERE region ILIKE $1 AND year BETWEEN $2 AND $3
       ORDER BY year ASC`,
      [region, decadeStart, decadeEnd],
    );

    const vintages = result.rows || [];

    if (vintages.length === 0) {
      return `No vintage data available for ${region} in the ${decadeStart}s.`;
    }

    const vintageList = vintages
      .map(
        (v) =>
          `${v.year}: ${v.rating || "Unrated"}/10 - ${v.summary?.substring(0, 50) || ""}`,
      )
      .join("\n");

    const prompt = `Analyze the evolution of ${region} wines during ${decadeStart}-${decadeEnd}.
Base your analysis on these vintage notes:
${vintageList}

Describe:
1. Stylistic trends across the decade
2. Climate patterns and their impact
3. Quality trajectory
4. Notable "best buys" and investment-grade vintages
5. How this decade compares to historical context

Write in 200-300 words, professio nal sommelier tone.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.8,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error summarizing decade:", error);
    throw error;
  }
}

/**
 * Get vintage ratings and statistics for a region
 * @param {string} region - Wine region
 * @param {number} limit - Number of vintages to return
 * @returns {array} vintages sorted by year desc
 */
export async function getVintageHistory(region, limit = 50) {
  try {
    const result = await db.query(
      `SELECT year, rating, summary, created_at FROM vintages
       WHERE region ILIKE $1
       ORDER BY year DESC
       LIMIT $2`,
      [region, limit],
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error getting vintage history:", error);
    return [];
  }
}

/**
 * Get best vintages in a region (by rating)
 * @param {string} region - Wine region
 * @param {number} limit - Number to return
 * @returns {array} top-rated vintages
 */
export async function getBestVintages(region, limit = 10) {
  try {
    const result = await db.query(
      `SELECT year, rating, summary FROM vintages
       WHERE region ILIKE $1 AND rating IS NOT NULL
       ORDER BY rating DESC
       LIMIT $2`,
      [region, limit],
    );

    return result.rows || [];
  } catch (error) {
    console.error("Error getting best vintages:", error);
    return [];
  }
}

/**
 * Update vintage with actual rating/climate data
 * @param {string} region - Wine region
 * @param {number} year - Vintage year
 * @param {object} updates - Fields to update
 * @returns {object} result
 */
export async function updateVintage(region, year, updates) {
  try {
    const { rating, rainfall_mm, avg_temp, summary } = updates;

    await db.query(
      `UPDATE vintages
       SET rating = COALESCE($1, rating),
           rainfall_mm = COALESCE($2, rainfall_mm),
           avg_temp = COALESCE($3, avg_temp),
           summary = COALESCE($4, summary)
       WHERE region ILIKE $5 AND year = $6`,
      [rating, rainfall_mm, avg_temp, summary, region, year],
    );

    return { status: "updated", region, year };
  } catch (error) {
    console.error("Error updating vintage:", error);
    throw error;
  }
}
