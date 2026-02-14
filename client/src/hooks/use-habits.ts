import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Item, type ItemCompletion } from "@shared/routes";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type HabitWithCompletions = Item & { completions: ItemCompletion[] };

export function useHabits() {
  return useQuery({
    queryKey: [api.habits.list.path],
    queryFn: async () => {
      const res = await fetch(api.habits.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch habits");
      return res.json() as Promise<HabitWithCompletions[]>;
    },
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { title: string; recurrenceRule?: string; scheduledTime?: string | null }) => {
      const res = await fetch(api.habits.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: data.title, type: "habit", recurrenceRule: data.recurrenceRule || "daily", scheduledTime: data.scheduledTime || null }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create habit");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
      toast({ title: "Habit created", description: "Let's build a streak." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, any>) => {
      const url = buildUrl(api.habits.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update habit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.habits.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete habit");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
      toast({ title: "Habit deleted" });
    },
  });
}

export function useToggleHabit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, date }: { id: number; date: Date }) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const url = buildUrl(api.habits.toggle.path, { id });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle habit");
      return res.json() as Promise<{ completed: boolean }>;
    },
    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: [api.habits.list.path] });
      const previousHabits = queryClient.getQueryData<HabitWithCompletions[]>([api.habits.list.path]);
      const dateStr = format(date, "yyyy-MM-dd");

      if (previousHabits) {
        queryClient.setQueryData(
          [api.habits.list.path],
          previousHabits.map((h) => {
            if (h.id === id) {
              const isCompleted = h.completions.some(c => c.date === dateStr);
              return {
                ...h,
                completions: isCompleted
                  ? h.completions.filter(c => c.date !== dateStr)
                  : [...h.completions, { id: -1, itemId: h.id, date: dateStr, completedAt: new Date().toISOString(), notes: null }]
              };
            }
            return h;
          })
        );
      }
      return { previousHabits };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData([api.habits.list.path], context?.previousHabits);
      toast({ title: "Failed to update", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [api.habits.list.path] });
    },
  });
}
