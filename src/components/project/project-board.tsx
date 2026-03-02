"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Kanban, List, CalendarDays, Settings } from "lucide-react";
import { KanbanBoard } from "@/components/project/kanban-board";
import { ListView } from "@/components/project/list-view";
import { CalendarView } from "@/components/project/calendar-view";
import { TaskDialog } from "@/components/project/task-dialog";
import type { Project, Task, ProjectMember } from "@/lib/types";
import { toast } from "sonner";

interface ProjectBoardProps {
  project: Project;
  initialTasks: Task[];
  members: ProjectMember[];
  currentUserId: string;
}

export function ProjectBoard({
  project,
  initialTasks,
  members,
  currentUserId,
}: ProjectBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`project-${project.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${project.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => {
              const exists = prev.some(
                (t) => t.id === (payload.new as Task).id,
              );
              if (exists) return prev;
              return [...prev, payload.new as Task].sort(
                (a, b) => a.position - b.position,
              );
            });
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === (payload.new as Task).id
                  ? { ...t, ...(payload.new as Task) }
                  : t,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) =>
              prev.filter((t) => t.id !== (payload.old as Task).id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project.id, supabase]);

  const handleTaskCreate = async (data: Partial<Task>) => {
    const maxPosition =
      tasks.length > 0
        ? Math.max(
            ...tasks
              .filter((t) => t.status === data.status)
              .map((t) => t.position),
          )
        : 0;

    const { error } = await supabase.from("tasks").insert({
      ...data,
      project_id: project.id,
      created_by: currentUserId,
      position: maxPosition + 1,
    });

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task created");
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from("tasks")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", taskId);

    if (error) {
      toast.error(error.message);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Task deleted");
  };

  const handleOpenEditDialog = (task: Task) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsTaskDialogOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        {project.description && (
          <p className="text-muted-foreground text-sm hidden md:block">
            {project.description}
          </p>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={() => {
              setEditingTask(null);
              setIsTaskDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Views */}
      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit">
          <TabsTrigger value="kanban" className="gap-2">
            <Kanban className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 min-h-0 mt-4">
          <KanbanBoard
            tasks={tasks}
            members={members}
            onTaskUpdate={handleTaskUpdate}
            onTaskEdit={handleOpenEditDialog}
            onTaskDelete={handleTaskDelete}
            onAddTask={(status) => {
              setEditingTask({ status } as Task);
              setIsTaskDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="list" className="flex-1 min-h-0 mt-4">
          <ListView
            tasks={tasks}
            members={members}
            onTaskUpdate={handleTaskUpdate}
            onTaskEdit={handleOpenEditDialog}
            onTaskDelete={handleTaskDelete}
          />
        </TabsContent>

        <TabsContent value="calendar" className="flex-1 min-h-0 mt-4">
          <CalendarView tasks={tasks} onTaskEdit={handleOpenEditDialog} />
        </TabsContent>
      </Tabs>

      {/* Task Create/Edit Dialog */}
      <TaskDialog
        open={isTaskDialogOpen}
        onClose={handleCloseDialog}
        task={editingTask}
        members={members}
        onSubmit={(data) => {
          if (editingTask?.id) {
            handleTaskUpdate(editingTask.id, data);
            handleCloseDialog();
          } else {
            handleTaskCreate(data);
          }
        }}
      />
    </div>
  );
}
