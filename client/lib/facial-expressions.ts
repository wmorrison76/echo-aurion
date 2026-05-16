/**
 * Facial Expressions System
 * Handles avatar emotions, expressions, and blending
 */

import * as BABYLON from '@babylonjs/core';

export type Expression =
  | 'neutral'
  | 'listening'
  | 'thinking'
  | 'confident'
  | 'happy'
  | 'concerned'
  | 'surprised'
  | 'confused'
  | 'blinking';

interface ExpressionConfig {
  morphTargets: Record<string, number>;
  eyebrowRotation?: number;
  headTilt?: number;
  eyeLookTarget?: BABYLON.Vector3;
  duration: number;
}

export class FacialExpressions {
  private scene: BABYLON.Scene;
  private morphTargetManager: BABYLON.MorphTargetManager | null = null;
  private currentExpression: Expression = 'neutral';
  private expressionAnimations: BABYLON.Animatable[] = [];
  
  private readonly EXPRESSIONS: Record<Expression, ExpressionConfig> = {
    neutral: {
      morphTargets: {
        'eyeSquintLeft': 0,
        'eyeSquintRight': 0,
        'eyeWideLeft': 0,
        'eyeWideRight': 0,
        'browDown': 0,
        'browUp': 0,
      },
      duration: 200,
    },
    
    listening: {
      morphTargets: {
        'eyeWideLeft': 0.3,
        'eyeWideRight': 0.3,
        'browUp': 0.4, // Attentive raised brows
      },
      headTilt: 0.1, // Slight head tilt toward speaker
      duration: 300,
    },
    
    thinking: {
      morphTargets: {
        'eyeLookUp': 0.5, // Eyes looking up (introspection)
        'mouthOpen': 0.2, // Slight "hmm" mouth
      },
      eyebrowRotation: 0.15,
      headTilt: -0.2, // Head tilted slightly
      duration: 400,
    },
    
    confident: {
      morphTargets: {
        'mouthSmile': 0.7, // Confident smile
        'eyeSquintLeft': 0.2,
        'eyeSquintRight': 0.2, // Smile lines around eyes
        'browUp': 0.2,
      },
      eyeLookTarget: new BABYLON.Vector3(0, 0, -2), // Direct eye contact
      duration: 300,
    },
    
    happy: {
      morphTargets: {
        'mouthSmile': 1.0, // Full smile
        'eyeSquintLeft': 0.4, // Strong smile lines
        'eyeSquintRight': 0.4,
        'cheekRaise': 0.6, // Raised cheeks
        'browUp': 0.3,
      },
      duration: 400,
    },
    
    concerned: {
      morphTargets: {
        'browDown': 0.6, // Furrowed brows
        'eyeWideLeft': 0.3,
        'eyeWideRight': 0.3,
        'mouthFrown': 0.3, // Slight frown
      },
      eyebrowRotation: -0.2,
      duration: 300,
    },
    
    surprised: {
      morphTargets: {
        'eyeWideLeft': 1.0, // Wide eyes
        'eyeWideRight': 1.0,
        'browUp': 0.8, // Raised eyebrows
        'mouthOpen': 0.8, // Open mouth
      },
      duration: 200,
    },
    
    confused: {
      morphTargets: {
        'browDown': 0.4,
        'browUp': 0.4, // Asymmetric brows (confused look)
        'eyeLookUp': 0.3,
        'mouthSmile': 0.2, // Uncertain smile
      },
      eyebrowRotation: 0.1,
      headTilt: 0.15,
      duration: 300,
    },
    
    blinking: {
      morphTargets: {
        'eyeBlinkLeft': 1.0, // Close left eye
        'eyeBlinkRight': 1.0, // Close right eye
      },
      duration: 150,
    },
  };
  
  constructor(scene: BABYLON.Scene) {
    this.scene = scene;
  }
  
  /**
   * Set morph target manager
   */
  setMorphTargetManager(manager: BABYLON.MorphTargetManager): void {
    this.morphTargetManager = manager;
  }
  
  /**
   * Apply expression with smooth blending
   */
  applyExpression(expression: Expression, duration?: number): void {
    // Stop existing animations
    this.expressionAnimations.forEach(anim => anim.stop());
    this.expressionAnimations = [];
    
    const config = this.EXPRESSIONS[expression];
    const animationDuration = duration || config.duration;
    
    // Apply morph target changes
    Object.entries(config.morphTargets).forEach(([targetName, targetValue]) => {
      const morphTarget = this.morphTargetManager?.getTarget(targetName);
      if (morphTarget) {
        const currentValue = morphTarget.influence || 0;
        
        const anim = BABYLON.Animation.CreateAndStartAnimation(
          `expr_${expression}_${targetName}`,
          morphTarget,
          'influence',
          60,
          animationDuration,
          currentValue,
          targetValue,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        if (anim) {
          this.expressionAnimations.push(anim);
        }
      }
    });
    
    this.currentExpression = expression;
  }
  
  /**
   * Get current expression
   */
  getCurrentExpression(): Expression {
    return this.currentExpression;
  }
  
  /**
   * Blend between two expressions
   */
  blendExpression(
    fromExpression: Expression,
    toExpression: Expression,
    duration: number = 400
  ): void {
    const fromConfig = this.EXPRESSIONS[fromExpression];
    const toConfig = this.EXPRESSIONS[toExpression];
    
    // Interpolate between all morphTargets
    const allTargets = new Set([
      ...Object.keys(fromConfig.morphTargets),
      ...Object.keys(toConfig.morphTargets),
    ]);
    
    allTargets.forEach(targetName => {
      const fromValue = fromConfig.morphTargets[targetName] || 0;
      const toValue = toConfig.morphTargets[targetName] || 0;
      
      const morphTarget = this.morphTargetManager?.getTarget(targetName);
      if (morphTarget) {
        const currentValue = morphTarget.influence || 0;
        
        const anim = BABYLON.Animation.CreateAndStartAnimation(
          `blend_${targetName}`,
          morphTarget,
          'influence',
          60,
          duration,
          currentValue,
          toValue,
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        if (anim) {
          this.expressionAnimations.push(anim);
        }
      }
    });
    
    this.currentExpression = toExpression;
  }
  
  /**
   * Cycle through expressions for demo/testing
   */
  cycleExpressions(interval: number = 2000): void {
    const expressions: Expression[] = [
      'neutral',
      'listening',
      'thinking',
      'happy',
      'surprised',
      'confident',
      'concerned',
    ];
    
    let index = 0;
    setInterval(() => {
      this.applyExpression(expressions[index % expressions.length]);
      index++;
    }, interval);
  }
  
  /**
   * Get expression by sentiment/emotion
   */
  getExpressionForEmotion(emotion: string): Expression {
    const emotionMap: Record<string, Expression> = {
      positive: 'happy',
      negative: 'concerned',
      neutral: 'neutral',
      question: 'listening',
      statement: 'confident',
      uncertainty: 'confused',
      surprise: 'surprised',
      thinking: 'thinking',
    };
    
    return emotionMap[emotion.toLowerCase()] || 'neutral';
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.expressionAnimations.forEach(anim => anim.stop());
    this.expressionAnimations = [];
  }
}

export default FacialExpressions;
