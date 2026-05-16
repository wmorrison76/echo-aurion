// File: src/components/EchoCore/components/interaction/DraggableModuleContainer.jsx
import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// [TEAM LOG: Phase 2] - Drag & Drop container for Whiteboard modules
export default function DraggableModuleContainer({ modules, setModules }) {
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const updated = Array.from(modules);
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    setModules(updated);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="modules">
        {(provided) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className="grid gap-4"
          >
            {modules.map((mod, idx) => (
              <Draggable key={mod.id} draggableId={mod.id} index={idx}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="bg-white p-4 rounded-xl shadow-sm"
                  >
                    {mod.content}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
