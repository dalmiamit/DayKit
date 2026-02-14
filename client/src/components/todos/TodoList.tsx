import { useTodos, useUpdateTodo, useCreateTodo, useDeleteTodo } from "@/hooks/use-todos";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Calendar, Clock, Sun, CalendarRange, Pencil } from "lucide-react";
import { ConvertMenu } from "@/components/ConvertMenu";
import { ScheduleOptions, getInitialMode, type ScheduleResult } from "@/components/ScheduleOptions";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Item } from "@shared/routes";

function scheduleLabel(item: Item): string | null {
  if (item.deadlineDate) return `Due by ${item.deadlineDate}`;
  if (item.flexible && item.scheduledDate) return `Weekend (${item.scheduledDate})`;
  if (item.scheduledDate && item.scheduledTime) return `${item.scheduledDate} at ${item.scheduledTime}`;
  if (item.scheduledDate) return item.scheduledDate;
  return null;
}

function CreateTodoDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: createTodo, isPending } = useCreateTodo();
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState<ScheduleResult>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createTodo({
      title: title.trim(),
      scheduledDate: schedule.scheduledDate,
      scheduledTime: schedule.scheduledTime,
      flexible: schedule.flexible,
      deadlineDate: schedule.deadlineDate,
    }, {
      onSuccess: () => {
        setOpen(false);
        setTitle("");
        setSchedule({});
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTitle(""); setSchedule({}); } }}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          data-testid="button-add-todo"
        >
          <Plus className="h-4 w-4" />
          <span>Add a to-do</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">New Task</DialogTitle>
          <DialogDescription>What needs to be done?</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="todo-title" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Title</Label>
            <Input
              id="todo-title"
              placeholder="e.g. Buy groceries"
              className="h-12 rounded-xl border-border bg-secondary/30 focus:bg-background transition-colors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              data-testid="input-todo-title"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">When</Label>
            <ScheduleOptions onChange={setSchedule} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()} className="rounded-xl px-6" data-testid="button-create-todo">
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTodoDialog({ item, children }: { item: Item; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const { mutate: updateTodo, isPending } = useUpdateTodo();
  const [title, setTitle] = useState(item.title);
  const [schedule, setSchedule] = useState<ScheduleResult>({
    scheduledDate: item.scheduledDate,
    scheduledTime: item.scheduledTime,
    flexible: item.flexible ?? false,
    deadlineDate: item.deadlineDate,
  });

  const initMode = getInitialMode(item);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    updateTodo({
      id: item.id,
      title: title.trim(),
      scheduledDate: schedule.scheduledDate ?? null,
      scheduledTime: schedule.scheduledTime ?? null,
      flexible: schedule.flexible ?? false,
      deadlineDate: schedule.deadlineDate ?? null,
    }, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) {
        setTitle(item.title);
        setSchedule({
          scheduledDate: item.scheduledDate,
          scheduledTime: item.scheduledTime,
          flexible: item.flexible ?? false,
          deadlineDate: item.deadlineDate,
        });
        setDialogKey(k => k + 1);
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Edit Task</DialogTitle>
          <DialogDescription>Update your task details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label htmlFor="edit-todo-title" className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Title</Label>
            <Input
              id="edit-todo-title"
              className="h-12 rounded-xl border-border bg-secondary/30 focus:bg-background transition-colors"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              data-testid="input-edit-todo-title"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">When</Label>
            <ScheduleOptions
              key={dialogKey}
              initialMode={initMode}
              initialDate={item.scheduledDate || ""}
              initialTime={item.scheduledTime || ""}
              onChange={setSchedule}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending || !title.trim()} className="rounded-xl px-6" data-testid="button-save-todo">
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TodoList() {
  const { data: todos, isLoading } = useTodos();
  const { mutate: updateTodo } = useUpdateTodo();
  const { mutate: deleteTodo } = useDeleteTodo();

  if (isLoading) return <div className="h-32 w-full animate-pulse rounded-xl bg-secondary/30" />;

  const isEmpty = !todos || todos.length === 0;
  const isCompleted = (todo: { status: string }) => todo.status === "completed";

  return (
    <div className="space-y-3">
      {todos?.map((todo) => {
        const label = scheduleLabel(todo);
        return (
          <div
            key={todo.id}
            className="group flex items-center gap-3 rounded-xl border border-transparent bg-card p-3 shadow-sm transition-all hover:border-border hover:shadow-md"
            data-testid={`todo-item-${todo.id}`}
          >
            <Checkbox
              checked={isCompleted(todo)}
              onCheckedChange={(checked) => updateTodo({ id: todo.id, status: checked ? "completed" : "active" })}
              className="h-5 w-5 rounded-md border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              data-testid={`checkbox-todo-${todo.id}`}
            />

            <div className="flex-1 flex flex-col justify-center">
              <span className={cn(
                "text-sm transition-colors",
                isCompleted(todo) ? "text-muted-foreground line-through" : "text-foreground font-medium"
              )}>
                {todo.title}
              </span>
              {label && (
                <span className={cn(
                  "text-[10px] flex items-center gap-1",
                  isCompleted(todo) ? "text-muted-foreground/50" : "text-muted-foreground"
                )}>
                  {todo.deadlineDate ? (
                    <CalendarRange className="h-2.5 w-2.5" />
                  ) : todo.flexible ? (
                    <Sun className="h-2.5 w-2.5" />
                  ) : todo.scheduledTime ? (
                    <Clock className="h-2.5 w-2.5" />
                  ) : (
                    <Calendar className="h-2.5 w-2.5" />
                  )}
                  {label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5 invisible group-hover:visible">
              <EditTodoDialog item={todo}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  data-testid={`button-edit-todo-${todo.id}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </EditTodoDialog>
              <ConvertMenu itemId={todo.id} currentType="todo" />
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => deleteTodo(todo.id)}
                data-testid={`button-delete-todo-${todo.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}

      <CreateTodoDialog />
    </div>
  );
}
