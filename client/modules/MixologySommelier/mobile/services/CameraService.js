/**
 * Camera Service
 * Handles camera operations and photo capture
 */

import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export class CameraService {
  /**
   * Request camera permissions
   * @returns {Promise<boolean>}
   */
  static async requestPermissions() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Capture photo from camera
   * @param {Object} options - Capture options
   * @returns {Promise<{uri: string, base64?: string}>}
   */
  static async capturePhoto(options = {}) {
    const hasPermission = await this.requestPermissions();
    
    if (!hasPermission) {
      throw new Error('Camera permission not granted');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
      base64: true,
      ...options,
    });

    if (result.canceled) {
      throw new Error('Photo capture cancelled');
    }

    const photo = result.assets[0];

    // Enhance image for better ML detection
    const enhanced = await this.enhanceImage(photo.uri);

    return {
      uri: enhanced.uri,
      base64: photo.base64,
      width: photo.width,
      height: photo.height,
    };
  }

  /**
   * Pick photo from gallery
   * @param {Object} options - Pick options
   * @returns {Promise<{uri: string, base64?: string}>}
   */
  static async pickPhoto(options = {}) {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
      base64: true,
      ...options,
    });

    if (result.canceled) {
      throw new Error('Photo selection cancelled');
    }

    const photo = result.assets[0];
    const enhanced = await this.enhanceImage(photo.uri);

    return {
      uri: enhanced.uri,
      base64: photo.base64,
      width: photo.width,
      height: photo.height,
    };
  }

  /**
   * Enhance image for better ML detection
   * @param {string} uri - Image URI
   * @returns {Promise<{uri: string}>}
   */
  static async enhanceImage(uri) {
    // Enhance contrast and brightness for better detection
    const enhanced = await manipulateAsync(
      uri,
      [
        { resize: { width: 1920 } }, // Resize for optimal processing
      ],
      {
        compress: 0.9,
        format: SaveFormat.JPEG,
      }
    );

    return enhanced;
  }

  /**
   * Check if camera is available
   * @returns {Promise<boolean>}
   */
  static async isAvailable() {
    const hasPermission = await this.requestPermissions();
    return hasPermission && CameraView.isAvailable();
  }
}
