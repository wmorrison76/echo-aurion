/**
 * Volume Scanner Component
 * Camera-based volume detection for bottles
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { CameraService } from '../services/CameraService';
import { VolumeDetectionService } from '../services/VolumeDetectionService';

export default function VolumeScanner({ onScanComplete, mode = 'bottle' }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    setScanning(false);
    setProcessing(true);

    try {
      // Capture photo
      const photo = await CameraService.capturePhoto({
        quality: 0.9,
        base64: true,
      });

      // Detect volume
      const detectionResult = await VolumeDetectionService.detectVolume(
        photo.uri,
        mode
      );

      if (detectionResult.success) {
        setResult(detectionResult);
        setShowResult(true);
      } else {
        Alert.alert(
          'Detection Failed',
          detectionResult.error || 'Could not detect volume. Please try again.',
          [
            { text: 'Retry', onPress: () => setScanning(true) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to capture photo');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (result && onScanComplete) {
      onScanComplete(result);
    }
    setShowResult(false);
    setResult(null);
  };

  const handleOverride = async () => {
    Alert.prompt(
      'Manual Volume Entry',
      'Enter volume percentage (0-100):',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          onPress: async (text) => {
            const manualVolume = parseFloat(text);
            if (isNaN(manualVolume) || manualVolume < 0 || manualVolume > 100) {
              Alert.alert('Invalid', 'Please enter a number between 0 and 100');
              return;
            }

            // Report override for ML improvement
            if (result?.scanId) {
              await VolumeDetectionService.reportOverride(
                result.scanId,
                manualVolume
              );
            }

            const overrideResult = {
              ...result,
              volumePercent: manualVolume,
              override: true,
            };

            if (onScanComplete) {
              onScanComplete(overrideResult);
            }
            setShowResult(false);
            setResult(null);
          },
        },
      ],
      'plain-text',
      result?.volumePercent?.toString() || ''
    );
  };

  const handleRescan = () => {
    setShowResult(false);
    setResult(null);
    setScanning(true);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera permission is required for volume scanning
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanning && !processing && !showResult && (
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setScanning(true)}
        >
          <Text style={styles.scanButtonText}>📸 Scan Bottle</Text>
        </TouchableOpacity>
      )}

      {scanning && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            mode="picture"
          >
            <View style={styles.overlay}>
              <View style={styles.scanFrame} />
              <Text style={styles.instructionText}>
                Position bottle in frame
              </Text>
            </View>
          </CameraView>

          <View style={styles.cameraControls}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setScanning(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {processing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={styles.processingText}>Analyzing bottle...</Text>
        </View>
      )}

      {showResult && result && (
        <Modal
          visible={showResult}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowResult(false)}
        >
          <View style={styles.resultModal}>
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Scan Result</Text>

              {result.imageUri && (
                <Image
                  source={{ uri: result.imageUri }}
                  style={styles.resultImage}
                />
              )}

              <View style={styles.resultInfo}>
                <Text style={styles.resultItemName}>
                  {result.itemName || 'Unknown Item'}
                </Text>
                <View style={styles.volumeDisplay}>
                  <Text style={styles.volumePercent}>
                    {result.volumePercent?.toFixed(1)}%
                  </Text>
                  <Text style={styles.volumeLabel}>Full</Text>
                </View>
                <Text style={styles.confidenceText}>
                  Confidence: {Math.round((result.confidence || 0) * 100)}%
                </Text>
              </View>

              <View style={styles.resultActions}>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmButtonText}>✓ Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.overrideButton}
                  onPress={handleOverride}
                >
                  <Text style={styles.overrideButtonText}>✗ Override</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={handleRescan}
                >
                  <Text style={styles.rescanButtonText}>📸 Rescan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanFrame: {
    width: '80%',
    height: '60%',
    borderWidth: 3,
    borderColor: '#8B0000',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B0000',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  resultModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  resultImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'contain',
  },
  resultInfo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  volumeDisplay: {
    alignItems: 'center',
    marginBottom: 8,
  },
  volumePercent: {
    fontSize: 48,
    fontWeight: '800',
    color: '#8B0000',
  },
  volumeLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  confidenceText: {
    fontSize: 14,
    color: '#666',
  },
  resultActions: {
    width: '100%',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overrideButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  overrideButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rescanButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rescanButtonText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#8B0000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
