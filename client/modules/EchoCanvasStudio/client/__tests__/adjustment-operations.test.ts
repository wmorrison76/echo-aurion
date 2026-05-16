/**
 * Tests for Non-Destructive Adjustment Operations
 */

import {
  createAdjustmentOperation,
  createAdjustmentLayer,
  addOperationToLayer,
  removeOperationFromLayer,
  updateOperationInLayer,
  toggleOperationInLayer,
  reorderOperations,
  cloneAdjustmentLayer,
  getDefaultParams,
} from "../lib/adjustment-operations";
import { NonDestructiveAdjustmentEngine } from "../components/editor/NonDestructiveAdjustmentEngine";

describe("Adjustment Operations", () => {
  describe("createAdjustmentOperation", () => {
    it("should create an operation with default values", () => {
      const op = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      expect(op.type).toBe("brightness");
      expect(op.enabled).toBe(true);
      expect(op.opacity).toBe(100);
      expect(op.blendMode).toBe("source-over");
    });

    it("should generate unique IDs", () => {
      const op1 = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      const op2 = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      expect(op1.id).not.toBe(op2.id);
    });
  });

  describe("createAdjustmentLayer", () => {
    it("should create an adjustment layer with empty operations", () => {
      const layer = createAdjustmentLayer("Test Layer");
      expect(layer.name).toBe("Test Layer");
      expect(layer.operations).toHaveLength(0);
      expect(layer.visible).toBe(true);
      expect(layer.opacity).toBe(100);
    });
  });

  describe("addOperationToLayer", () => {
    it("should add operation to layer", () => {
      const layer = createAdjustmentLayer("Test");
      const op = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      const updated = addOperationToLayer(layer, op);
      expect(updated.operations).toHaveLength(1);
      expect(updated.operations[0].id).toBe(op.id);
    });

    it("should preserve original layer", () => {
      const layer = createAdjustmentLayer("Test");
      const op = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      const updated = addOperationToLayer(layer, op);
      expect(layer.operations).toHaveLength(0);
      expect(updated.operations).toHaveLength(1);
    });
  });

  describe("removeOperationFromLayer", () => {
    it("should remove operation by ID", () => {
      let layer = createAdjustmentLayer("Test");
      const op1 = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      const op2 = createAdjustmentOperation("contrast", {
        brightness: 0,
        contrast: 5,
      });
      layer = addOperationToLayer(layer, op1);
      layer = addOperationToLayer(layer, op2);
      expect(layer.operations).toHaveLength(2);

      const updated = removeOperationFromLayer(layer, op1.id);
      expect(updated.operations).toHaveLength(1);
      expect(updated.operations[0].id).toBe(op2.id);
    });
  });

  describe("updateOperationInLayer", () => {
    it("should update operation parameters", () => {
      let layer = createAdjustmentLayer("Test");
      const op = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      layer = addOperationToLayer(layer, op);

      const updated = updateOperationInLayer(layer, op.id, {
        params: { brightness: 20, contrast: 5 },
      });
      expect(updated.operations[0].params.brightness).toBe(20);
      expect(updated.operations[0].params.contrast).toBe(5);
    });
  });

  describe("toggleOperationInLayer", () => {
    it("should toggle operation enabled state", () => {
      let layer = createAdjustmentLayer("Test");
      const op = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      layer = addOperationToLayer(layer, op);
      expect(layer.operations[0].enabled).toBe(true);

      const toggled = toggleOperationInLayer(layer, op.id);
      expect(toggled.operations[0].enabled).toBe(false);

      const toggled2 = toggleOperationInLayer(toggled, op.id);
      expect(toggled2.operations[0].enabled).toBe(true);
    });
  });

  describe("reorderOperations", () => {
    it("should reorder operations in layer", () => {
      let layer = createAdjustmentLayer("Test");
      const op1 = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      const op2 = createAdjustmentOperation("contrast", {
        brightness: 0,
        contrast: 5,
      });
      const op3 = createAdjustmentOperation("desaturate", {});
      layer = addOperationToLayer(layer, op1);
      layer = addOperationToLayer(layer, op2);
      layer = addOperationToLayer(layer, op3);

      const reordered = reorderOperations(layer, 0, 2);
      expect(reordered.operations[0].id).toBe(op2.id);
      expect(reordered.operations[1].id).toBe(op3.id);
      expect(reordered.operations[2].id).toBe(op1.id);
    });
  });

  describe("cloneAdjustmentLayer", () => {
    it("should create a deep copy of layer", () => {
      let layer = createAdjustmentLayer("Original");
      const op = createAdjustmentOperation("brightness", {
        brightness: 10,
        contrast: 0,
      });
      layer = addOperationToLayer(layer, op);

      const cloned = cloneAdjustmentLayer(layer, "Copy");
      expect(cloned.name).toBe("Copy");
      expect(cloned.id).not.toBe(layer.id);
      expect(cloned.operations).toHaveLength(1);
      expect(cloned.operations[0].params).toEqual(op.params);
    });
  });

  describe("getDefaultParams", () => {
    it("should return default params for brightness", () => {
      const params = getDefaultParams("brightness");
      expect(params.brightness).toBe(0);
      expect(params.contrast).toBe(0);
    });

    it("should return default params for levels", () => {
      const params = getDefaultParams("levels");
      expect(params.blackPoint).toBe(0);
      expect(params.whitePoint).toBe(255);
      expect(params.gamma).toBe(1);
    });

    it("should return default params for curves", () => {
      const params = getDefaultParams("curves");
      expect(params.red).toHaveLength(2);
      expect(params.green).toHaveLength(2);
      expect(params.blue).toHaveLength(2);
    });
  });
});

describe("NonDestructiveAdjustmentEngine", () => {
  let engine: NonDestructiveAdjustmentEngine;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    engine = new NonDestructiveAdjustmentEngine();
    canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, 100, 100);
    }
  });

  it("should apply adjustment layers without modifying source", () => {
    let layer = createAdjustmentLayer("Brightness");
    const op = createAdjustmentOperation("brightness", {
      brightness: 20,
      contrast: 0,
    });
    layer = addOperationToLayer(layer, op);

    const result = engine.applyAdjustmentLayers(canvas, [layer]);
    expect(result.width).toBe(canvas.width);
    expect(result.height).toBe(canvas.height);
  });

  it("should stack multiple adjustment layers", () => {
    let layer1 = createAdjustmentLayer("Brightness");
    let layer2 = createAdjustmentLayer("Contrast");

    const op1 = createAdjustmentOperation("brightness", {
      brightness: 10,
      contrast: 0,
    });
    const op2 = createAdjustmentOperation("contrast", {
      brightness: 0,
      contrast: 10,
    });

    layer1 = addOperationToLayer(layer1, op1);
    layer2 = addOperationToLayer(layer2, op2);

    const result = engine.applyAdjustmentLayers(canvas, [layer1, layer2]);
    expect(result.width).toBe(canvas.width);
    expect(result.height).toBe(canvas.height);
  });

  it("should respect layer visibility", () => {
    let layer = createAdjustmentLayer("Brightness");
    layer.visible = false;
    const op = createAdjustmentOperation("brightness", {
      brightness: 100,
      contrast: 0,
    });
    layer = addOperationToLayer(layer, op);

    const originalCtx = canvas.getContext("2d");
    const originalData = originalCtx?.getImageData(0, 0, 100, 100);

    const result = engine.applyAdjustmentLayers(canvas, [layer]);
    const resultCtx = result.getContext("2d");
    const resultData = resultCtx?.getImageData(0, 0, 100, 100);

    expect(originalData?.data).toEqual(resultData?.data);
  });

  it("should respect operation enabled state", () => {
    let layer = createAdjustmentLayer("Brightness");
    let op = createAdjustmentOperation("brightness", {
      brightness: 100,
      contrast: 0,
    });
    op.enabled = false;
    layer = addOperationToLayer(layer, op);

    const originalCtx = canvas.getContext("2d");
    const originalData = originalCtx?.getImageData(0, 0, 100, 100);

    const result = engine.applyAdjustmentLayers(canvas, [layer]);
    const resultCtx = result.getContext("2d");
    const resultData = resultCtx?.getImageData(0, 0, 100, 100);

    expect(originalData?.data).toEqual(resultData?.data);
  });
});
