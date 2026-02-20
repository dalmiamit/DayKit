import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Item, type ItemCompletion } from "@shared/routes";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type RecurringEventWithCompletions = Item & { completions: ItemCompletion[] };

export function useRecurringEvents() {
  return useQuery({
    queryKey: [api.recurringEvents.list.path],
    queryFn: async () => {
      const res = await fetch(api.recurringEvents.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recurring events");
      return res.json() as Promise<RecurringEventWithCompletions[]>;
    },
  });
}

export function useCreateRecurringEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      recurrenceRule: string;
      scheduledTime?: string | null;
    }) => {
      const res = await fetch(api.recurringEvents.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          type: "recurring_event",
          recurrenceRule: data.recurrenceRule,
          scheduledTime: data.scheduledTime || null,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create recurring event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recurringEvents.list.path] });
      toast({ title: "Recurring event added" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useToggleRecurringEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, date }: { id: number; date: Date }) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const url = buildUrl(api.recurringEvents.toggle.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle event");
      return res.json() as Promise<{ completed: boolean }>;
    },
    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: [api.recurringEvents.list.path] });
      const previous = queryClient.getQueryData<RecurringEventWithCompletions[]>([api.recurringEvents.list.path]);
      const dateStr = format(date, "yyyy-MM-dd");
      if (previous) {
        queryClient.setQueryData(
          [api.recurringEvents.list.path],
          previous.map((e) => {
            if (e.id !== id) return e;
            const isCompleted = e.completions.some(c => c.date === dateStr);
            return {
              ...e,
              completions: isCompleted
                ? e.completions.filter(c => c.date !== dateStr)
                : [...e.completions, { id: -1, itemId: e.id, date: dateStr, completedAt: new Date().toISOString(), notes: null }],
            };
          })
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData([api.recurringEvents.list.path], context?.previous);
      toast({ title: "Failed to update", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.recurringEvents.list.path] });
    },
  });
}

export function useDeleteRecurringEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.recurringEvents.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete event");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.recurringEvents.list.path] });
      toast({ title: "Event removed" });
    },
  });
}
