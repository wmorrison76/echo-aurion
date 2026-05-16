/**
 * Volume Detection Service
 * AI-powered bottle volume detection from photos
 */

import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export class VolumeDetectionService {
  /**
   * Detect volume from bottle photo
   * @param {string} imageUri - Local file URI of the photo
   * @param {string} mode - 'bottle' | 'wine' | 'spirit'
   * @returns {Promise<VolumeDetectionResult>}
   */
  static async detectVolume(imageUri, mode = 'bottle') {
    try {
      // Convert image to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Send to backend ML service
      const response = await axios.post(
        `${API_BASE_URL}/volume/detect`,
        {
          image: base64,
          mode,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        }
      );

      return {
        success: true,
        ...response.data,
        imageUri, // Keep local URI
      };
    } catch (error) {
      console.error('Volume detection error:', error);
      return {
        success: false,
        error: error.message || 'Volume detection failed',
        imageUri,
      };
    }
  }

  /**
   * Batch scan multiple bottles
   * @param {Array<string>} imageUris - Array of image URIs
   * @param {string} mode - 'bottle' | 'wine' | 'spirit'
   * @returns {Promise<Array<VolumeDetectionResult>>}
   */
  static async batchScan(imageUris, mode = 'bottle') {
    const results = [];
    
    for (const imageUri of imageUris) {
      const result = await this.detectVolume(imageUri, mode);
      results.push(result);
      
      // Small delay to prevent API overload
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }

  /**
   * Override volume detection result with manual value
   * Used for ML model improvement
   * @param {string} scanId - Original scan ID
   * @param {number} manualVolume - Manually entered volume %
   */
  static async reportOverride(scanId, manualVolume) {
    try {
      await axios.post(`${API_BASE_URL}/volume/override`, {
        scanId,
        manualVolume,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to report override:', error);
    }
  }
}

/**
 * @typedef {Object} VolumeDetectionResult
 * @property {boolean} success
 * @property {string} itemId - Detected item ID
 * @property {string} itemName - Detected item name
 * @property {number} volumePercent - Volume percentage (0-100)
 * @property {number} volumeML - Volume in milliliters
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} imageUri - Local image URI
 * @property {Object} bottleInfo - Bottle recognition info
 * @property {Object} liquidLevel - Liquid level detection info
 * @property {Date} timestamp
 * @property {string} error - Error message if failed
 */
