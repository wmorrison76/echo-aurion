/**
 * LUCCCA | SEG-C-CD-05
 * File: packages/echoscope/src/panes/CakeDesigner/ExportPrintModel.ts
 * Created: 2025-07-27 by ChatGPT
 * Depends On: three, three/examples/jsm/exporters/GLTFExporter
 * Exposes: exportGLTF, exportPNG, printModel
 * Location Notes: Consumed by CakeDesigner pane & sub-tools
 * Tests: __tests__/cake-designer/exportPrintModel.test.ts
 * ADR: docs/rfc/RFC-cake-designer-costing-and-rendering.md
 */

import { WebGLRenderer, Object3D, Scene, PerspectiveCamera, ColorSpace } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export interface GLTFExportOptions {
  binary?: boolean;
  trs?: boolean;
  onlyVisible?: boolean;
  truncateDrawRange?: boolean;
  embedImages?: boolean;
}

export function exportGLTF(root: Object3D, opts: GLTFExportOptions = {}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(root, (result) => {
      try {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }));
        } else {
          resolve(new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' }));
        }
      } catch (err) {
        reject(err);
      }
    }, opts);
  });
}

export async function exportPNG(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, pixelRatio = 2): Promise<Blob> {
  const prevPr = renderer.getPixelRatio();
  renderer.setPixelRatio(pixelRatio);
  renderer.render(scene, camera);
  const dataURL = renderer.domElement.toDataURL('image/png');
  renderer.setPixelRatio(prevPr);
  const res = await fetch(dataURL);
  return await res.blob();
}

export function printModel(pngBlob: Blob) {
  const url = URL.createObjectURL(pngBlob);
  const img = new Image();
  img.src = url;
  const w = window.open('');
  if (!w) return;
  w.document.write(img.outerHTML);
  w.document.close();
  w.focus();
  w.print();
  URL.revokeObjectURL(url);
}
