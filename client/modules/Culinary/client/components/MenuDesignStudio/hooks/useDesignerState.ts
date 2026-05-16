import { useCallback, useReducer } from "react";

export type DesignerElementType =
  | "heading"
  | "subheading"
  | "body"
  | "menu-item"
  | "image"
  | "shape"
  | "divider"
  | "group"
  | "component";

export type DesignerElement = {
  id: string;
  type: DesignerElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  text?: string;
  description?: string;
  price?: number;
  currency?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through" | "overline";
  color?: string;
  accentColor?: string;
  imageUrl?: string;
  objectFit?: "cover" | "contain";
  shape?: "rectangle" | "ellipse";
  fill?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  thickness?: number;
  locked?: boolean;
  parentGroupId?: string;
  childElementIds?: string[];
  componentId?: string;
  componentOverrides?: Record<string, Partial<DesignerElement>>;
};

export type ComponentDefinition = {
  id: string;
  name: string;
  description?: string;
  baseElement: Omit<DesignerElement, "id" | "componentId" | "componentOverrides">;
  createdAt: number;
  updatedAt: number;
};

export type CanvasSettings = {
  background: string;
  margin: number;
  bleed: number;
  columns: number;
  gutter: number;
  showGrid: boolean;
  showMargins: boolean;
  showBleed: boolean;
  showColumns: boolean;
  zoom: number;
  gridSize: number;
};

export type PageSize = {
  width: number;
  height: number;
};

export type DesignerState = {
  elements: DesignerElement[];
  selectedElementId: string | null;
  selectedElementIds: string[];
  components: ComponentDefinition[];
  canvasSettings: CanvasSettings;
  pageSize: PageSize;
  documentName: string;
  isDirty: boolean;
};

export type DesignerAction =
  | { type: "ADD_ELEMENT"; payload: DesignerElement }
  | { type: "REMOVE_ELEMENT"; payload: string }
  | { type: "UPDATE_ELEMENT"; payload: { id: string; updates: Partial<DesignerElement> } }
  | { type: "SELECT_ELEMENT"; payload: string | null }
  | { type: "SELECT_MULTIPLE"; payload: string[] }
  | { type: "ADD_TO_SELECTION"; payload: string }
  | { type: "REMOVE_FROM_SELECTION"; payload: string }
  | { type: "TOGGLE_SELECTION"; payload: string }
  | { type: "CLEAR_SELECTION"; payload: void }
  | { type: "UPDATE_MULTIPLE"; payload: { ids: string[]; updates: Partial<DesignerElement> } }
  | { type: "DELETE_MULTIPLE"; payload: string[] }
  | { type: "GROUP_ELEMENTS"; payload: { elementIds: string[]; groupName: string } }
  | { type: "UNGROUP_ELEMENTS"; payload: string }
  | { type: "CREATE_COMPONENT"; payload: { elementId: string; componentName: string } }
  | { type: "DELETE_COMPONENT"; payload: string }
  | { type: "CREATE_COMPONENT_INSTANCE"; payload: { componentId: string; x: number; y: number } }
  | { type: "UPDATE_COMPONENT_OVERRIDE"; payload: { instanceId: string; propertyPath: string; value: any } }
  | { type: "SET_ELEMENTS"; payload: DesignerElement[] }
  | { type: "SET_COMPONENTS"; payload: ComponentDefinition[] }
  | { type: "UPDATE_CANVAS_SETTINGS"; payload: Partial<CanvasSettings> }
  | { type: "SET_PAGE_SIZE"; payload: PageSize }
  | { type: "SET_DOCUMENT_NAME"; payload: string }
  | { type: "SET_DIRTY"; payload: boolean }
  | { type: "REORDER_ELEMENTS"; payload: { fromId: string; toId: string; mode: "above" | "below" } }
  | { type: "DUPLICATE_ELEMENT"; payload: string }
  | { type: "RESET_STATE"; payload: DesignerState };

const INITIAL_STATE: DesignerState = {
  elements: [],
  selectedElementId: null,
  selectedElementIds: [],
  components: [],
  canvasSettings: {
    background: "#ffffff",
    margin: 24,
    bleed: 18,
    columns: 1,
    gutter: 24,
    showGrid: false,
    showMargins: true,
    showBleed: false,
    showColumns: false,
    zoom: 1,
    gridSize: 16,
  },
  pageSize: {
    width: 816,
    height: 1056,
  },
  documentName: "Untitled Menu",
  isDirty: false,
};

function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
  switch (action.type) {
    case "ADD_ELEMENT":
      return {
        ...state,
        elements: [...state.elements, action.payload],
        isDirty: true,
      };

    case "REMOVE_ELEMENT":
      return {
        ...state,
        elements: state.elements.filter((el) => el.id !== action.payload),
        selectedElementId:
          state.selectedElementId === action.payload ? null : state.selectedElementId,
        selectedElementIds: state.selectedElementIds.filter((id) => id !== action.payload),
        isDirty: true,
      };

    case "UPDATE_ELEMENT":
      return {
        ...state,
        elements: state.elements.map((el) =>
          el.id === action.payload.id
            ? { ...el, ...action.payload.updates }
            : el
        ),
        isDirty: true,
      };

    case "SELECT_ELEMENT":
      return {
        ...state,
        selectedElementId: action.payload,
        selectedElementIds: action.payload ? [action.payload] : [],
      };

    case "SELECT_MULTIPLE":
      return {
        ...state,
        selectedElementIds: action.payload,
        selectedElementId: action.payload.length === 1 ? action.payload[0] : null,
      };

    case "ADD_TO_SELECTION":
      return {
        ...state,
        selectedElementIds: [...new Set([...state.selectedElementIds, action.payload])],
        selectedElementId: null,
      };

    case "REMOVE_FROM_SELECTION":
      return {
        ...state,
        selectedElementIds: state.selectedElementIds.filter((id) => id !== action.payload),
        selectedElementId: state.selectedElementIds.length === 1 ? null : state.selectedElementId,
      };

    case "TOGGLE_SELECTION":
      return {
        ...state,
        selectedElementIds: state.selectedElementIds.includes(action.payload)
          ? state.selectedElementIds.filter((id) => id !== action.payload)
          : [...state.selectedElementIds, action.payload],
        selectedElementId: null,
      };

    case "CLEAR_SELECTION":
      return {
        ...state,
        selectedElementId: null,
        selectedElementIds: [],
      };

    case "UPDATE_MULTIPLE":
      return {
        ...state,
        elements: state.elements.map((el) =>
          action.payload.ids.includes(el.id)
            ? { ...el, ...action.payload.updates }
            : el
        ),
        isDirty: true,
      };

    case "DELETE_MULTIPLE":
      return {
        ...state,
        elements: state.elements.filter((el) => !action.payload.includes(el.id)),
        selectedElementId: null,
        selectedElementIds: [],
        isDirty: true,
      };

    case "GROUP_ELEMENTS": {
      const { elementIds, groupName } = action.payload;
      if (elementIds.length < 2) return state;

      const elementsToGroup = state.elements.filter((el) => elementIds.includes(el.id));
      const minX = Math.min(...elementsToGroup.map((el) => el.x));
      const minY = Math.min(...elementsToGroup.map((el) => el.y));
      const maxX = Math.max(...elementsToGroup.map((el) => el.x + el.width));
      const maxY = Math.max(...elementsToGroup.map((el) => el.y + el.height));

      const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const groupElement: DesignerElement = {
        id: groupId,
        type: "group",
        name: groupName,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        rotation: 0,
        opacity: 1,
        zIndex: Math.max(...elementsToGroup.map((el) => el.zIndex)) + 1,
        childElementIds: elementIds,
        locked: false,
      };

      const updatedElements = state.elements.map((el) =>
        elementIds.includes(el.id)
          ? { ...el, parentGroupId: groupId }
          : el
      );

      return {
        ...state,
        elements: [...updatedElements, groupElement],
        selectedElementIds: [groupId],
        selectedElementId: groupId,
        isDirty: true,
      };
    }

    case "UNGROUP_ELEMENTS": {
      const groupId = action.payload;
      const groupElement = state.elements.find((el) => el.id === groupId && el.type === "group");
      if (!groupElement || !groupElement.childElementIds) return state;

      const updatedElements = state.elements
        .filter((el) => el.id !== groupId)
        .map((el) =>
          el.parentGroupId === groupId
            ? { ...el, parentGroupId: undefined }
            : el
        );

      return {
        ...state,
        elements: updatedElements,
        selectedElementIds: groupElement.childElementIds,
        selectedElementId: null,
        isDirty: true,
      };
    }

    case "CREATE_COMPONENT": {
      const elementId = action.payload.elementId;
      const element = state.elements.find((el) => el.id === elementId);
      if (!element) return state;

      const componentId = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const componentDef: ComponentDefinition = {
        id: componentId,
        name: action.payload.componentName,
        baseElement: {
          ...element,
          id: undefined as any,
          componentId: undefined,
          componentOverrides: undefined,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      return {
        ...state,
        components: [...state.components, componentDef],
        elements: state.elements.map((el) =>
          el.id === elementId
            ? { ...el, componentId }
            : el
        ),
        isDirty: true,
      };
    }

    case "DELETE_COMPONENT": {
      const componentId = action.payload;
      return {
        ...state,
        components: state.components.filter((c) => c.id !== componentId),
        elements: state.elements.map((el) =>
          el.componentId === componentId
            ? { ...el, componentId: undefined }
            : el
        ),
        isDirty: true,
      };
    }

    case "CREATE_COMPONENT_INSTANCE": {
      const { componentId, x, y } = action.payload;
      const component = state.components.find((c) => c.id === componentId);
      if (!component) return state;

      const newElement: DesignerElement = {
        ...component.baseElement,
        id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x,
        y,
        componentId,
        componentOverrides: {},
      };

      return {
        ...state,
        elements: [...state.elements, newElement],
        selectedElementIds: [newElement.id],
        selectedElementId: newElement.id,
        isDirty: true,
      };
    }

    case "UPDATE_COMPONENT_OVERRIDE": {
      const { instanceId, propertyPath, value } = action.payload;
      return {
        ...state,
        elements: state.elements.map((el) =>
          el.id === instanceId && el.componentId
            ? {
                ...el,
                componentOverrides: {
                  ...el.componentOverrides,
                  [propertyPath]: value,
                },
              }
            : el
        ),
        isDirty: true,
      };
    }

    case "SET_COMPONENTS":
      return {
        ...state,
        components: action.payload,
        isDirty: true,
      };

    case "SET_ELEMENTS":
      return {
        ...state,
        elements: action.payload,
        isDirty: true,
      };

    case "UPDATE_CANVAS_SETTINGS":
      return {
        ...state,
        canvasSettings: {
          ...state.canvasSettings,
          ...action.payload,
        },
        isDirty: true,
      };

    case "SET_PAGE_SIZE":
      return {
        ...state,
        pageSize: action.payload,
        isDirty: true,
      };

    case "SET_DOCUMENT_NAME":
      return {
        ...state,
        documentName: action.payload,
        isDirty: true,
      };

    case "SET_DIRTY":
      return {
        ...state,
        isDirty: action.payload,
      };

    case "REORDER_ELEMENTS": {
      const { fromId, toId, mode } = action.payload;
      const fromIndex = state.elements.findIndex((el) => el.id === fromId);
      const toIndex = state.elements.findIndex((el) => el.id === toId);

      if (fromIndex === -1 || toIndex === -1) return state;

      const newElements = [...state.elements];
      const [movedElement] = newElements.splice(fromIndex, 1);

      const insertIndex = mode === "above" ? toIndex : toIndex + 1;
      newElements.splice(insertIndex, 0, movedElement);

      return {
        ...state,
        elements: newElements,
        isDirty: true,
      };
    }

    case "DUPLICATE_ELEMENT": {
      const elementToDuplicate = state.elements.find((el) => el.id === action.payload);
      if (!elementToDuplicate) return state;

      const newElement: DesignerElement = {
        ...elementToDuplicate,
        id: `${elementToDuplicate.id}-${Date.now()}`,
        x: elementToDuplicate.x + 20,
        y: elementToDuplicate.y + 20,
        name: `${elementToDuplicate.name} (copy)`,
      };

      return {
        ...state,
        elements: [...state.elements, newElement],
        selectedElementId: newElement.id,
        isDirty: true,
      };
    }

    case "RESET_STATE":
      return action.payload;

    default:
      return state;
  }
}

export function useDesignerState(initialState?: Partial<DesignerState>) {
  const [state, dispatch] = useReducer(designerReducer, {
    ...INITIAL_STATE,
    ...initialState,
  });

  const clipboardRef = { current: null as DesignerElement[] | null };

  const addElement = useCallback(
    (element: Omit<DesignerElement, "id">) => {
      dispatch({
        type: "ADD_ELEMENT",
        payload: {
          ...element,
          id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        },
      });
    },
    []
  );

  const removeElement = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ELEMENT", payload: id });
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<DesignerElement>) => {
    dispatch({ type: "UPDATE_ELEMENT", payload: { id, updates } });
  }, []);

  const copyElements = useCallback((ids: string[]) => {
    const elementsToCopy = state.elements.filter((el) => ids.includes(el.id));
    if (elementsToCopy.length > 0) {
      clipboardRef.current = JSON.parse(JSON.stringify(elementsToCopy));
      return true;
    }
    return false;
  }, [state.elements]);

  const cutElements = useCallback((ids: string[]) => {
    const success = copyElements(ids);
    if (success) {
      dispatch({ type: "DELETE_MULTIPLE", payload: ids });
    }
    return success;
  }, [copyElements]);

  const pasteElements = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.length === 0) {
      return [];
    }

    const pastedIds: string[] = [];
    clipboardRef.current.forEach((element) => {
      const newElement: DesignerElement = {
        ...element,
        id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        x: element.x + 20,
        y: element.y + 20,
        parentGroupId: undefined,
        childElementIds: element.type === "group" ? [...(element.childElementIds || [])] : undefined,
      };
      dispatch({
        type: "ADD_ELEMENT",
        payload: newElement,
      });
      pastedIds.push(newElement.id);
    });

    return pastedIds;
  }, []);

  const selectElement = useCallback((id: string | null) => {
    dispatch({ type: "SELECT_ELEMENT", payload: id });
  }, []);

  const setElements = useCallback((elements: DesignerElement[]) => {
    dispatch({ type: "SET_ELEMENTS", payload: elements });
  }, []);

  const updateCanvasSettings = useCallback((settings: Partial<CanvasSettings>) => {
    dispatch({ type: "UPDATE_CANVAS_SETTINGS", payload: settings });
  }, []);

  const setPageSize = useCallback((size: PageSize) => {
    dispatch({ type: "SET_PAGE_SIZE", payload: size });
  }, []);

  const setDocumentName = useCallback((name: string) => {
    dispatch({ type: "SET_DOCUMENT_NAME", payload: name });
  }, []);

  const setDirty = useCallback((dirty: boolean) => {
    dispatch({ type: "SET_DIRTY", payload: dirty });
  }, []);

  const reorderElements = useCallback(
    (fromId: string, toId: string, mode: "above" | "below") => {
      dispatch({ type: "REORDER_ELEMENTS", payload: { fromId, toId, mode } });
    },
    []
  );

  const duplicateElement = useCallback((id: string) => {
    dispatch({ type: "DUPLICATE_ELEMENT", payload: id });
  }, []);

  const resetState = useCallback((newState: DesignerState) => {
    dispatch({ type: "RESET_STATE", payload: newState });
  }, []);

  const getSelectedElement = useCallback(() => {
    return state.elements.find((el) => el.id === state.selectedElementId);
  }, [state.elements, state.selectedElementId]);

  const selectMultiple = useCallback((ids: string[]) => {
    dispatch({ type: "SELECT_MULTIPLE", payload: ids });
  }, []);

  const addToSelection = useCallback((id: string) => {
    dispatch({ type: "ADD_TO_SELECTION", payload: id });
  }, []);

  const removeFromSelection = useCallback((id: string) => {
    dispatch({ type: "REMOVE_FROM_SELECTION", payload: id });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_SELECTION", payload: id });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION", payload: undefined });
  }, []);

  const updateMultiple = useCallback(
    (ids: string[], updates: Partial<DesignerElement>) => {
      dispatch({ type: "UPDATE_MULTIPLE", payload: { ids, updates } });
    },
    []
  );

  const deleteMultiple = useCallback((ids: string[]) => {
    dispatch({ type: "DELETE_MULTIPLE", payload: ids });
  }, []);

  const getSelectedElements = useCallback(() => {
    return state.elements.filter((el) => state.selectedElementIds.includes(el.id));
  }, [state.elements, state.selectedElementIds]);

  const groupElements = useCallback(
    (elementIds: string[], groupName: string) => {
      dispatch({ type: "GROUP_ELEMENTS", payload: { elementIds, groupName } });
    },
    []
  );

  const ungroupElements = useCallback((groupId: string) => {
    dispatch({ type: "UNGROUP_ELEMENTS", payload: groupId });
  }, []);

  const createComponent = useCallback(
    (elementId: string, componentName: string) => {
      dispatch({ type: "CREATE_COMPONENT", payload: { elementId, componentName } });
    },
    []
  );

  const deleteComponent = useCallback((componentId: string) => {
    dispatch({ type: "DELETE_COMPONENT", payload: componentId });
  }, []);

  const createComponentInstance = useCallback(
    (componentId: string, x: number, y: number) => {
      dispatch({ type: "CREATE_COMPONENT_INSTANCE", payload: { componentId, x, y } });
    },
    []
  );

  const updateComponentOverride = useCallback(
    (instanceId: string, propertyPath: string, value: any) => {
      dispatch({ type: "UPDATE_COMPONENT_OVERRIDE", payload: { instanceId, propertyPath, value } });
    },
    []
  );

  const setComponents = useCallback((components: ComponentDefinition[]) => {
    dispatch({ type: "SET_COMPONENTS", payload: components });
  }, []);

  return {
    state,
    dispatch,
    addElement,
    removeElement,
    updateElement,
    selectElement,
    setElements,
    updateCanvasSettings,
    setPageSize,
    setDocumentName,
    setDirty,
    reorderElements,
    duplicateElement,
    resetState,
    getSelectedElement,
    selectMultiple,
    addToSelection,
    removeFromSelection,
    toggleSelection,
    clearSelection,
    updateMultiple,
    deleteMultiple,
    getSelectedElements,
    groupElements,
    ungroupElements,
    createComponent,
    deleteComponent,
    createComponentInstance,
    updateComponentOverride,
    setComponents,
    copyElements,
    cutElements,
    pasteElements,
  };
}
