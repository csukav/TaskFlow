"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KanbanCard } from "@/components/project/kanban-card";
import { Badge } from "@/components/ui/badge";
import type { Task, TaskStatus, ProjectMember } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

function DroppableColumn({
  status,
  children,
}: {
  status: TaskStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-2 space-y-2 min-h-[100px] rounded-md transition-colors",
        isOver && "bg-primary/5",
      )}
    >
      {children}
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  members: ProjectMember[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => Promise<void>;
  onAddTask: (status: TaskStatus) => void;
}

export function KanbanBoard({
  tasks,
  members,
  onTaskUpdate,
  onTaskEdit,
  onTaskDelete,
  onAddTask,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Sync with external tasks
  if (
    JSON.stringify(tasks.map((t) => t.id)) !==
      JSON.stringify(localTasks.map((t) => t.id)) ||
    tasks.length !== localTasks.length
  ) {
    setLocalTasks(tasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const getTasksByStatus = (status: TaskStatus) =>
    localTasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.position - b.position);

  const handleDragStart = (event: DragStartEvent) => {
    const task = localTasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localTasks.find((t) => t.id === activeId);
    const overTask = localTasks.find((t) => t.id === overId);

    if (!activeTask) return;

    // Dragging over a column header
    if (COLUMNS.includes(overId as TaskStatus)) {
      if (activeTask.status !== overId) {
        setLocalTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, status: overId as TaskStatus } : t,
          ),
        );
      }
      return;
    }

    // Dragging over a task
    if (overTask && activeTask.status !== overTask.status) {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: overTask.status } : t,
        ),
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = localTasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    let newStatus = activeTask.status;
    if (COLUMNS.includes(overId as TaskStatus)) {
      newStatus = overId as TaskStatus;
    } else {
      const overTask = localTasks.find((t) => t.id === overId);
      if (overTask) newStatus = overTask.status;
    }

    const columnTasks = localTasks
      .filter((t) => t.status === newStatus)
      .sort((a, b) => a.position - b.position);

    const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
    const newIndex = COLUMNS.includes(overId as TaskStatus)
      ? columnTasks.length
      : columnTasks.findIndex((t) => t.id === overId);

    let reordered = arrayMove(
      columnTasks,
      oldIndex === -1 ? columnTasks.length - 1 : oldIndex,
      newIndex === -1 ? 0 : newIndex,
    );

    // Update positions
    await Promise.all(
      reordered.map((task, index) =>
        onTaskUpdate(task.id, { status: newStatus, position: index + 1 }),
      ),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {COLUMNS.map((status) => {
          const columnTasks = getTasksByStatus(status);
          return (
            <div
              key={status}
              className="flex flex-col w-72 shrink-0 rounded-lg bg-muted/40 border"
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-3 border-b">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      STATUS_COLORS[status],
                    )}
                  />
                  <span className="text-sm font-semibold">
                    {STATUS_LABELS[status]}
                  </span>
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {columnTasks.length}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddTask(status)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Task list */}
              <ScrollArea className="flex-1">
                <SortableContext
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                  id={status}
                >
                  <DroppableColumn status={status}>
                    {columnTasks.map((task) => (
                      <KanbanCard
                        key={task.id}
                        task={task}
                        onEdit={onTaskEdit}
                        onDelete={onTaskDelete}
                      />
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-xs text-muted-foreground border-2 border-dashed rounded-md">
                        Drop tasks here
                      </div>
                    )}
                  </DroppableColumn>
                </SortableContext>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <KanbanCard
            task={activeTask}
            onEdit={() => {}}
            onDelete={async () => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
