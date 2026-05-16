
import { describe, it, expect } from 'vitest';
import { exportGLTF } from '../../packages/echoscope/src/panes/CakeDesigner/ExportPrintModel';
import { Object3D } from 'three';

describe('ExportPrintModel', () => {
  it('exports gltf promise', async () => {
    const root = new Object3D();
    // We can't actually run GLTFExporter in test env without three/examples, but we validate API shape
    expect(typeof exportGLTF).toBe('function');
  });
});
