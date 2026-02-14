import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Item } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useTodos() {
  return useQuery({
    queryKey: [api.todos.list.path],
    queryFn: async () => {
      const res = await fetch(api.todos.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch todos");
      return res.json() as Promise<Item[]>;
    },
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { title: string; scheduledDate?: string | null; scheduledTime?: string | null; flexible?: boolean; deadlineDate?: string | null }) => {
      const res = await fetch(api.todos.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, type: "todo" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create todo");
      return res.json() as Promise<Item>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.todos.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/backlog"] });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    }
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, any>) => {
      const url = buildUrl(api.todos.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update todo");
      return res.json() as Promise<Item>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.todos.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/backlog"] });
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.todos.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete todo");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.todos.list.path] });
      toast({ title: "Task completed", description: "Removed from your list." });
    },
  });
}
