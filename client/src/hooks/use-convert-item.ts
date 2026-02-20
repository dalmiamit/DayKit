import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

const typeLabels: Record<string, string> = {
  todo: "To-Do",
  habit: "Habit",
  event: "Event",
  recurring_event: "Recurring Event",
};

export function useConvertItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, type }: { id: number; type: "todo" | "habit" | "event" | "recurring_event" }) => {
      const url = buildUrl(api.items.convert.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to convert item");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.todos.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.recurringEvents.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/backlog"] });
      toast({
        title: `Converted to ${typeLabels[variables.type]}`,
      });
    },
    onError: (error) => {
      toast({ title: "Conversion failed", description: error.message, variant: "destructive" });
    },
  });
}
