import { db } from "./db";
import { eq, and, desc, isNull, lt, inArray, ne } from "drizzle-orm";
import {
  items, itemCompletions,
  type Item, type InsertItem,
  type ItemCompletion,
} from "@shared/schema";

export interface IStorage {
  getHabits(userId: string): Promise<(Item & { completions: ItemCompletion[] })[]>;
  getHabit(id: number): Promise<Item | undefined>;
  createHabit(habit: InsertItem & { userId: string }): Promise<Item>;
  updateHabit(id: number, updates: Partial<InsertItem>): Promise<Item>;
  deleteHabit(id: number): Promise<void>;
  toggleHabitCompletion(itemId: number, date: string, notes?: string): Promise<{ completed: boolean }>;

  getRecurringEvents(userId: string): Promise<(Item & { completions: ItemCompletion[] })[]>;
  createRecurringEvent(data: InsertItem & { userId: string }): Promise<Item>;
  deleteRecurringEvent(id: number): Promise<void>;

  getTodos(userId: string): Promise<Item[]>;
  getTodo(id: number): Promise<Item | undefined>;
  createTodo(todo: InsertItem & { userId: string }): Promise<Item>;
  updateTodo(id: number, updates: Partial<InsertItem>): Promise<Item>;
  deleteTodo(id: number): Promise<void>;
  convertItem(id: number, newType: string): Promise<Item>;
  getItem(id: number): Promise<Item | undefined>;
  getScheduledItems(userId: string, date: string): Promise<Item[]>;
  getBacklogTodos(userId: string): Promise<Item[]>;
}

export class DatabaseStorage implements IStorage {
  async getHabits(userId: string): Promise<(Item & { completions: ItemCompletion[] })[]> {
    const results = await db.query.items.findMany({
      where: and(
        eq(items.userId, userId),
        eq(items.type, "habit"),
        eq(items.status, "active")
      ),
      with: {
        completions: true,
      },
      orderBy: desc(items.createdAt),
    });
    return results;
  }

  async getHabit(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(and(eq(items.id, id), eq(items.type, "habit")));
    return item;
  }

  async createHabit(data: InsertItem & { userId: string }): Promise<Item> {
    const [item] = await db.insert(items).values({
      ...data,
      type: "habit",
      recurrenceRule: data.recurrenceRule || "daily",
    }).returning();
    return item;
  }

  async updateHabit(id: number, updates: Partial<InsertItem>): Promise<Item> {
    const [updated] = await db.update(items).set(updates).where(eq(items.id, id)).returning();
    return updated;
  }

  async deleteHabit(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(itemCompletions).where(eq(itemCompletions.itemId, id));
      await tx.delete(items).where(eq(items.id, id));
    });
  }

  async toggleHabitCompletion(itemId: number, date: string, notes?: string): Promise<{ completed: boolean }> {
    const [existing] = await db.select().from(itemCompletions).where(and(
      eq(itemCompletions.itemId, itemId),
      eq(itemCompletions.date, date)
    ));

    if (existing) {
      await db.delete(itemCompletions).where(eq(itemCompletions.id, existing.id));
      return { completed: false };
    } else {
      await db.insert(itemCompletions).values({ itemId, date, notes });
      return { completed: true };
    }
  }

  async getRecurringEvents(userId: string): Promise<(Item & { completions: ItemCompletion[] })[]> {
    const results = await db.query.items.findMany({
      where: and(
        eq(items.userId, userId),
        eq(items.type, "recurring_event"),
        eq(items.status, "active")
      ),
      with: { completions: true },
      orderBy: desc(items.createdAt),
    });
    return results;
  }

  async createRecurringEvent(data: InsertItem & { userId: string }): Promise<Item> {
    const [item] = await db.insert(items).values({
      ...data,
      type: "recurring_event",
    }).returning();
    return item;
  }

  async deleteRecurringEvent(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(itemCompletions).where(eq(itemCompletions.itemId, id));
      await tx.delete(items).where(eq(items.id, id));
    });
  }

  async getTodos(userId: string): Promise<Item[]> {
    return await db.select().from(items).where(and(
      eq(items.userId, userId),
      eq(items.type, "todo")
    )).orderBy(desc(items.createdAt));
  }

  async getTodo(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(and(eq(items.id, id), eq(items.type, "todo")));
    return item;
  }

  async createTodo(data: InsertItem & { userId: string }): Promise<Item> {
    const [item] = await db.insert(items).values({
      ...data,
      type: "todo",
    }).returning();
    return item;
  }

  async updateTodo(id: number, updates: Partial<InsertItem>): Promise<Item> {
    const setData: Record<string, any> = { ...updates };
    if (setData.status === "completed") {
      setData.completedAt = new Date();
    }
    const [updated] = await db.update(items).set(setData).where(eq(items.id, id)).returning();
    return updated;
  }

  async deleteTodo(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async convertItem(id: number, newType: string): Promise<Item> {
    const updates: Record<string, any> = { type: newType };
    if (newType === "habit") {
      updates.recurrenceRule = "daily";
      updates.status = "active";
      updates.completedAt = null;
    } else if (newType === "recurring_event") {
      updates.recurrenceRule = updates.recurrenceRule || "sunday";
      updates.status = "active";
      updates.completedAt = null;
    } else if (newType === "todo") {
      updates.recurrenceRule = null;
      updates.scheduledDate = null;
      updates.scheduledTime = null;
      updates.status = "active";
      updates.completedAt = null;
    } else if (newType === "event") {
      updates.recurrenceRule = null;
      updates.status = "active";
      updates.completedAt = null;
    }
    const [updated] = await db.update(items).set(updates).where(eq(items.id, id)).returning();
    return updated;
  }

  async getScheduledItems(userId: string, date: string): Promise<Item[]> {
    return await db.select().from(items).where(and(
      eq(items.userId, userId),
      inArray(items.type, ["todo", "event"]),
      eq(items.scheduledDate, date),
      ne(items.status, "completed")
    )).orderBy(items.scheduledTime);
  }

  async getBacklogTodos(userId: string): Promise<Item[]> {
    return await db.select().from(items).where(and(
      eq(items.userId, userId),
      eq(items.type, "todo"),
      isNull(items.scheduledDate),
      isNull(items.deadlineDate),
      ne(items.status, "completed"),
      ne(items.status, "dismissed"),
    )).orderBy(desc(items.createdAt));
  }
}

export const storage = new DatabaseStorage();
