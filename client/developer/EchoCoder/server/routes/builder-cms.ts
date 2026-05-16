/**
 * Builder.io CMS API Routes
 * Handles communication with Builder.io APIs for content management
 */

import type { RequestHandler } from "express";
import axios from "axios";

const BUILDER_IO_API = "https://api.builder.io/v2";

/**
 * Validate Builder.io API key
 */
export const validateBuilderKey: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;

    if (!apiKey) {
      return res.status(400).json({ error: "API key required" });
    }

    const response = await axios.get(`${BUILDER_IO_API}/spaces`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    res.json({ valid: true, spaces: response.data });
  } catch (error) {
    console.error("Builder.io validation error:", error);
    res.status(401).json({ valid: false, error: "Invalid API key" });
  }
};

/**
 * Get all content models from Builder.io space
 */
export const getContentModels: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const spaceId = req.query.spaceId as string;

    if (!apiKey) {
      return res.status(400).json({ error: "API key required" });
    }

    // Fetch models from Builder.io
    const response = await axios.get(`${BUILDER_IO_API}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      params: spaceId ? { spaceId } : {},
    });

    const models = response.data.results || [];

    // Transform to our format
    const transformedModels = models.map((model: any) => ({
      id: model.id,
      name: model.name,
      displayName: model.displayName || model.name,
      description: model.description,
      fields: (model.fields || []).map((field: any) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        defaultValue: field.defaultValue,
        description: field.helperText,
      })),
    }));

    res.json(transformedModels);
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
};

/**
 * Get content entries from a specific model
 */
export const getContent: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const modelId = req.params.modelId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!apiKey || !modelId) {
      return res.status(400).json({ error: "API key and model ID required" });
    }

    const response = await axios.get(`${BUILDER_IO_API}/content/${modelId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      params: {
        limit,
        offset,
        includeRefs: true,
      },
    });

    const data = response.data;

    res.json({
      results: data.results || [],
      total: data.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching content:", error);
    res.status(500).json({ error: "Failed to fetch content" });
  }
};

/**
 * Get a single content entry
 */
export const getContentById: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const modelId = req.params.modelId;
    const contentId = req.params.contentId;

    if (!apiKey || !modelId || !contentId) {
      return res
        .status(400)
        .json({ error: "API key, model ID, and content ID required" });
    }

    const response = await axios.get(
      `${BUILDER_IO_API}/content/${modelId}/${contentId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        params: {
          includeRefs: true,
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching content:", error);
    res.status(500).json({ error: "Failed to fetch content" });
  }
};

/**
 * Search content across models
 */
export const searchContent: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const query = req.query.q as string;
    const modelId = req.query.modelId as string;

    if (!apiKey || !query) {
      return res.status(400).json({ error: "API key and query required" });
    }

    const response = await axios.get(`${BUILDER_IO_API}/search`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      params: {
        q: query,
        model: modelId,
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error searching content:", error);
    res.status(500).json({ error: "Failed to search content" });
  }
};

/**
 * Create new content entry
 */
export const createContent: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const modelId = req.params.modelId;
    const { data } = req.body;

    if (!apiKey || !modelId) {
      return res.status(400).json({ error: "API key and model ID required" });
    }

    const response = await axios.post(
      `${BUILDER_IO_API}/content/${modelId}`,
      { data },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error creating content:", error);
    res.status(500).json({ error: "Failed to create content" });
  }
};

/**
 * Update content entry
 */
export const updateContent: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const modelId = req.params.modelId;
    const contentId = req.params.contentId;
    const { data } = req.body;

    if (!apiKey || !modelId || !contentId) {
      return res
        .status(400)
        .json({ error: "API key, model ID, and content ID required" });
    }

    const response = await axios.patch(
      `${BUILDER_IO_API}/content/${modelId}/${contentId}`,
      { data },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error updating content:", error);
    res.status(500).json({ error: "Failed to update content" });
  }
};

/**
 * Delete content entry
 */
export const deleteContent: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const modelId = req.params.modelId;
    const contentId = req.params.contentId;

    if (!apiKey || !modelId || !contentId) {
      return res
        .status(400)
        .json({ error: "API key, model ID, and content ID required" });
    }

    await axios.delete(`${BUILDER_IO_API}/content/${modelId}/${contentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting content:", error);
    res.status(500).json({ error: "Failed to delete content" });
  }
};

/**
 * Get content publishing status
 */
export const getPublishingStatus: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const modelId = req.params.modelId;
    const contentId = req.params.contentId;

    if (!apiKey || !modelId || !contentId) {
      return res
        .status(400)
        .json({ error: "API key, model ID, and content ID required" });
    }

    const response = await axios.get(
      `${BUILDER_IO_API}/content/${modelId}/${contentId}/publishing-status`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching publishing status:", error);
    res.status(500).json({ error: "Failed to fetch publishing status" });
  }
};

/**
 * Publish content entry
 */
export const publishContent: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const modelId = req.params.modelId;
    const contentId = req.params.contentId;

    if (!apiKey || !modelId || !contentId) {
      return res
        .status(400)
        .json({ error: "API key, model ID, and content ID required" });
    }

    const response = await axios.post(
      `${BUILDER_IO_API}/content/${modelId}/${contentId}/publish`,
      {},
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error publishing content:", error);
    res.status(500).json({ error: "Failed to publish content" });
  }
};

/**
 * Unpublish content entry
 */
export const unpublishContent: RequestHandler = async (req, res) => {
  try {
    const apiKey = req.headers["x-builder-api-key"] as string;
    const modelId = req.params.modelId;
    const contentId = req.params.contentId;

    if (!apiKey || !modelId || !contentId) {
      return res
        .status(400)
        .json({ error: "API key, model ID, and content ID required" });
    }

    const response = await axios.post(
      `${BUILDER_IO_API}/content/${modelId}/${contentId}/unpublish`,
      {},
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error unpublishing content:", error);
    res.status(500).json({ error: "Failed to unpublish content" });
  }
};

export default {
  validateBuilderKey,
  getContentModels,
  getContent,
  getContentById,
  searchContent,
  createContent,
  updateContent,
  deleteContent,
  getPublishingStatus,
  publishContent,
  unpublishContent,
};
