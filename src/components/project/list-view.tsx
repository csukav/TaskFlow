"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task, TaskStatus, ProjectMember } from "@/lib/types";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from "@/lib/types";
import { cn, formatDate, isOverdue, getInitials } from "@/lib/utils";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "in_review", "done"];

interface ListViewProps {
  tasks: Task[];
  members: ProjectMember[];
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (taskId: string) => Promise<void>;
}

export function ListView({
  tasks,
  members,
  onTaskUpdate,
  onTaskEdit,
  onTaskDelete,
}: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (status: string) => {
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  return (
    <div className="space-y-2 overflow-y-auto h-full pr-1">
      {COLUMNS.map((status) => {
        const statusTasks = tasks
          .filter((t) => t.status === status)
          .sort((a, b) => a.position - b.position);
        const isCollapsed = collapsed[status];

        return (
          <div
            key={status}
            className="border rounded-lg overflow-hidden bg-card"
          >
            {/* Section header */}
            <button
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => toggleSection(status)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <div
                className={cn("w-2 h-2 rounded-full", STATUS_COLORS[status])}
              />
              <span className="text-sm font-semibold">
                {STATUS_LABELS[status]}
              </span>
              <Badge variant="secondary" className="text-xs h-5 px-1.5 ml-1">
                {statusTasks.length}
              </Badge>
            </button>

            {/* Tasks */}
            {!isCollapsed && (
              <div className="border-t">
                {statusTasks.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No tasks in this section
                  </div>
                ) : (
                  <div className="divide-y">
                    {statusTasks.map((task) => {
                      const overdue =
                        isOverdue(task.due_date) && task.status !== "done";
                      return (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                        >
                          {/* Priority indicator */}
                          <div
                            className={cn("w-1.5 h-1.5 rounded-full shrink-0", {
                              "bg-slate-400": task.priority === "low",
                              "bg-blue-500": task.priority === "medium",
                              "bg-orange-500": task.priority === "high",
                              "bg-red-500": task.priority === "urgent",
                            })}
                          />

                          {/* Title */}
                          <span
                            className={cn(
                              "text-sm font-medium flex-1 truncate cursor-pointer hover:text-primary",
                              task.status === "done" &&
                                "line-through text-muted-foreground",
                            )}
                            onClick={() => onTaskEdit(task)}
                          >
                            {task.title}
                          </span>

                          {/* Priority badge */}
                          <span
                            className={cn(
                              "text-xs font-medium hidden sm:block",
                              PRIORITY_COLORS[task.priority],
                            )}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </span>

                          {/* Due date */}
                          {task.due_date && (
                            <div
                              className={cn(
                                "flex items-center gap-1 text-xs hidden md:flex",
                                overdue
                                  ? "text-destructive"
                                  : "text-muted-foreground",
                              )}
                            >
                              {overdue ? (
                                <AlertCircle className="h-3 w-3" />
                              ) : (
                                <Calendar className="h-3 w-3" />
                              )}
                              {formatDate(task.due_date)}
                            </div>
                          )}

                          {/* Assignee */}
                          {task.assignee && (
                            <Avatar className="h-6 w-6 hidden sm:flex">
                              <AvatarImage
                                src={task.assignee.avatar_url ?? undefined}
                              />
                              <AvatarFallback className="text-[10px]">
                                {getInitials(
                                  task.assignee.full_name ??
                                    task.assignee.email,
                                )}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          {/* Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onTaskEdit(task)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onTaskDelete(task.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
