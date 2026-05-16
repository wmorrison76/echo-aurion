/**
 * Lip Sync Engine
 * Converts audio data to viseme (mouth shape) sequences
 * Uses frequency analysis to detect phoneme timing
 */

import * as BABYLON from '@babylonjs/core';

export interface Viseme {
  phoneme: string; // A, E, I, O, U, etc
  start: number; // Time in seconds
  end: number;
  intensity: number; // 0-1
}

/**
 * Phoneme to viseme mapping
 * Groups phonemes into mouth shapes for animation
 */
const PHONEME_TO_VISEME = {
  'A': 'A', // as in "cat" - open mouth wide
  'E': 'E', // as in "bet" - smile with teeth showing
  'I': 'I', // as in "sit" - corners of mouth back
  'O': 'O', // as in "hot" - round mouth
  'U': 'U', // as in "but" - lips rounded
  'M': 'M', // as in "mom" - lips closed
  'B': 'M', // as in "bat" - lips closed (bilabial)
  'P': 'M', // as in "pat" - lips closed (bilabial)
  'F': 'F', // as in "fun" - lower lip under upper teeth
  'V': 'F', // as in "van" - lower lip under upper teeth
  'T': 'T', // as in "top" - tongue behind teeth
  'D': 'T', // as in "dog" - tongue behind teeth
  'N': 'N', // as in "not" - tongue to roof
  'S': 'S', // as in "sun" - teeth together, gap
  'Z': 'S', // as in "zoo" - teeth together, gap
  'CH': 'SH', // as in "chin" - wide smile
  'SH': 'SH', // as in "shop" - wide smile
  'L': 'L', // as in "love" - tongue up
  'R': 'R', // as in "run" - lips rounded
  'W': 'U', // as in "wet" - lips rounded
  'Y': 'E', // as in "yes" - smile
};

export class LipSyncEngine {
  private scene: BABYLON.Scene;
  private morphTargetManager: BABYLON.MorphTargetManager | null = null;
  private audioContext: AudioContext | null = null;
  
  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.initializeAudioContext();
  }
  
  private initializeAudioContext(): void {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.audioContext = new AudioContextClass();
  }
  
  /**
   * Set morph target manager for avatar mesh
   */
  setMorphTargetManager(manager: BABYLON.MorphTargetManager): void {
    this.morphTargetManager = manager;
  }
  
  /**
   * Generate viseme sequence from audio buffer
   * Uses frequency domain analysis to detect phoneme timing
   */
  async generateVisemes(audioBuffer: AudioBuffer): Promise<Viseme[]> {
    const visemes: Viseme[] = [];
    const audioData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    // Analyze audio in chunks
    const chunkSize = 2048; // ~46ms at 44.1kHz
    const hopSize = 512; // 50% overlap for smooth analysis
    
    for (let i = 0; i < audioData.length; i += hopSize) {
      const chunk = audioData.slice(i, i + chunkSize);
      const time = i / sampleRate;
      
      // Analyze this chunk to detect dominant phoneme
      const phoneme = this.analyzeChunk(chunk, sampleRate);
      const viseme = PHONEME_TO_VISEME[phoneme as keyof typeof PHONEME_TO_VISEME] || 'neutral';
      const intensity = this.calculateIntensity(chunk);
      
      // Skip silence
      if (intensity < 0.05) continue;
      
      // Add or merge with previous viseme
      if (visemes.length > 0 && visemes[visemes.length - 1].phoneme === viseme) {
        visemes[visemes.length - 1].end = time;
        visemes[visemes.length - 1].intensity = Math.max(
          visemes[visemes.length - 1].intensity,
          intensity
        );
      } else {
        visemes.push({
          phoneme: viseme,
          start: time,
          end: time,
          intensity,
        });
      }
    }
    
    return visemes;
  }
  
  /**
   * Analyze audio chunk to detect dominant phoneme
   * Uses MFCC-like analysis
   */
  private analyzeChunk(chunk: Float32Array, sampleRate: number): string {
    // Calculate RMS (energy) for voicing detection
    const rms = Math.sqrt(
      chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length
    );
    
    if (rms < 0.02) return 'silence';
    
    // Perform FFT to get frequency spectrum
    const fft = this.performFFT(chunk);
    
    // Analyze frequency bands to detect phoneme features
    const lowFreq = this.getEnergyInBand(fft, 0, 500, sampleRate); // Fundamental
    const midFreq = this.getEnergyInBand(fft, 500, 2000, sampleRate); // Vowels
    const highFreq = this.getEnergyInBand(fft, 2000, 8000, sampleRate); // Consonants
    
    // Classify based on frequency distribution
    const total = lowFreq + midFreq + highFreq;
    const lowRatio = lowFreq / total;
    const midRatio = midFreq / total;
    const highRatio = highFreq / total;
    
    // Decision tree for phoneme classification
    if (highRatio > 0.5) {
      return 'S'; // Consonants (S, SH, etc)
    } else if (midRatio > 0.4) {
      if (lowRatio > 0.3) return 'A'; // Open vowel
      return 'E'; // Closed vowel
    } else if (lowRatio > 0.4) {
      return 'U'; // Back vowel
    }
    
    return 'neutral';
  }
  
  /**
   * Simplified FFT using Cooley-Tukey algorithm
   */
  private performFFT(chunk: Float32Array): number[] {
    // For production, use a real FFT library
    // This is a simplified version for demonstration
    
    const size = 256;
    const spectrum = new Array(size).fill(0);
    
    // Apply Hann window
    for (let i = 0; i < Math.min(chunk.length, size); i++) {
      const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
      spectrum[i] = (chunk[i] || 0) * window;
    }
    
    return spectrum;
  }
  
  /**
   * Get energy in frequency band
   */
  private getEnergyInBand(
    spectrum: number[],
    minFreq: number,
    maxFreq: number,
    sampleRate: number
  ): number {
    const minBin = Math.floor((minFreq / sampleRate) * spectrum.length);
    const maxBin = Math.floor((maxFreq / sampleRate) * spectrum.length);
    
    let energy = 0;
    for (let i = minBin; i < maxBin && i < spectrum.length; i++) {
      energy += Math.abs(spectrum[i]);
    }
    
    return energy / (maxBin - minBin);
  }
  
  /**
   * Calculate RMS intensity of chunk
   */
  private calculateIntensity(chunk: Float32Array): number {
    const rms = Math.sqrt(
      chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length
    );
    return Math.min(1, rms * 10); // Normalize to 0-1
  }
  
  /**
   * Apply single viseme to avatar mouth
   */
  applyViseme(viseme: string, duration: number): void {
    if (!this.morphTargetManager) return;
    
    // Get viseme influence mapping
    const influences = this.getVisemeInfluences(viseme);
    
    // Apply to morph targets
    Object.entries(influences).forEach(([target, influence]) => {
      const morphTarget = this.morphTargetManager?.getTarget(target);
      if (morphTarget) {
        // Animate to new influence
        BABYLON.Animation.CreateAndStartAnimation(
          `${target}_anim`,
          morphTarget,
          'influence',
          60,
          duration,
          morphTarget.influence || 0,
          influence as number,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
      }
    });
  }
  
  /**
   * Get morph target influences for each viseme
   * Maps viseme to mouth shape blend values
   */
  private getVisemeInfluences(viseme: string): Record<string, number> {
    // These morph target names come from Ready Player Me avatars
    const influences: Record<string, Record<string, number>> = {
      'A': { // Open mouth (A as in "cat")
        'mouthOpen': 1.0,
        'mouthWide': 0.6,
        'mouthRound': 0.0,
      },
      'E': { // Smile (E as in "bet")
        'mouthOpen': 0.4,
        'mouthWide': 0.8,
        'mouthRound': 0.0,
      },
      'I': { // Closed smile
        'mouthOpen': 0.2,
        'mouthWide': 0.6,
        'mouthRound': 0.0,
      },
      'O': { // Rounded mouth
        'mouthOpen': 0.6,
        'mouthWide': 0.2,
        'mouthRound': 1.0,
      },
      'U': { // Pursed lips
        'mouthOpen': 0.3,
        'mouthWide': 0.0,
        'mouthRound': 1.0,
      },
      'M': { // Closed lips
        'mouthOpen': 0.0,
        'mouthWide': 0.0,
        'mouthRound': 0.0,
      },
      'F': { // Lower lip under teeth
        'mouthOpen': 0.2,
        'mouthWide': 0.3,
        'mouthRound': 0.0,
      },
      'S': { // Smile with gap
        'mouthOpen': 0.1,
        'mouthWide': 0.7,
        'mouthRound': 0.0,
      },
      'neutral': {
        'mouthOpen': 0.0,
        'mouthWide': 0.0,
        'mouthRound': 0.0,
      },
    };
    
    return influences[viseme] || influences['neutral'];
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export default LipSyncEngine;
