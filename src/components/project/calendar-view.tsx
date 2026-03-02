"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/types";
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  tasks: Task[];
  onTaskEdit: (task: Task) => void;
}

export function CalendarView({ tasks, onTaskEdit }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const tasksByDate = tasks.reduce<Record<string, Task[]>>((acc, task) => {
    if (!task.due_date) return acc;
    const dateKey = task.due_date.split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {});

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const cells: (number | null)[] = [
    ...Array(startPadding).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <div className="flex flex-col h-full border rounded-lg overflow-hidden bg-card">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {days.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {cells.map((day, i) => {
          if (day === null) {
            return (
              <div
                key={`empty-${i}`}
                className="border-b border-r p-1 bg-muted/10 min-h-[100px]"
              />
            );
          }

          const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");
          const dayTasks = tasksByDate[dateStr] ?? [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={cn(
                "border-b border-r p-1 min-h-[100px] overflow-hidden",
                isToday && "bg-primary/5",
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground",
                )}
              >
                {day}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskEdit(task)}
                    className={cn(
                      "w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate font-medium transition-opacity hover:opacity-80",
                      STATUS_COLORS[task.status].replace(
                        "bg-",
                        "bg-opacity-80 bg-",
                      ),
                      "text-white",
                    )}
                    style={{
                      backgroundColor:
                        task.status === "todo"
                          ? "#64748b"
                          : task.status === "in_progress"
                            ? "#3b82f6"
                            : task.status === "in_review"
                              ? "#eab308"
                              : "#22c55e",
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">
                    +{dayTasks.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
