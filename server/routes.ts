import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { initFirebaseAdmin, firebaseAuthMiddleware, isFirebaseAuthenticated, getFirebaseUserId } from "./firebase-auth";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  initFirebaseAdmin();
  app.use(firebaseAuthMiddleware);

  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    if (isFirebaseAuthenticated(req)) return next();
    if (req.session?.firebaseUser) return next();
    res.status(401).json({ message: "Unauthorized" });
  };

  const getUserId = (req: any): string => {
    if (req.isAuthenticated() && req.user?.claims?.sub) return req.user.claims.sub;
    if (req.session?.firebaseUser?.uid) return `firebase:${req.session.firebaseUser.uid}`;
    const firebaseUid = getFirebaseUserId(req);
    if (firebaseUid) return `firebase:${firebaseUid}`;
    throw new Error("No authenticated user");
  };

  app.post("/api/auth/firebase-session", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }
    const idToken = authHeader.substring(7);
    const { verifyFirebaseToken } = await import("./firebase-auth");
    const decoded = await verifyFirebaseToken(idToken);
    if (!decoded) return res.status(401).json({ message: "Invalid token" });
    (req.session as any).firebaseUser = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
    res.json({
      id: `firebase:${decoded.uid}`,
      email: decoded.email,
      firstName: decoded.name?.split(" ")[0] || null,
      lastName: decoded.name?.split(" ").slice(1).join(" ") || null,
      profileImageUrl: decoded.picture || null,
    });
  });

  // Habits
  app.get(api.habits.list.path, requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const habits = await storage.getHabits(userId);
    res.json(habits);
  });

  app.post(api.habits.create.path, requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const input = api.habits.create.input.parse(req.body);
      const habit = await storage.createHabit({ ...input, userId });
      res.status(201).json(habit);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.habits.update.path, requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.habits.update.input.parse(req.body);
      const existing = await storage.getHabit(id);
      if (!existing || existing.userId !== getUserId(req)) {
        return res.status(404).json({ message: "Habit not found" });
      }
      const updated = await storage.updateHabit(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation error" });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete(api.habits.delete.path, requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getHabit(id);
    if (!existing || existing.userId !== getUserId(req)) {
      return res.status(404).json({ message: "Habit not found" });
    }
    await storage.deleteHabit(id);
    res.sendStatus(204);
  });

  app.post(api.habits.toggle.path, requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getHabit(id);
    if (!existing || existing.userId !== getUserId(req)) {
      return res.status(404).json({ message: "Habit not found" });
    }
    try {
      const { date } = req.body;
      if (!date) return res.status(400).json({ message: "Date required" });
      const result = await storage.toggleHabitCompletion(id, date);
      res.json(result);
    } catch (e) {
      res.status(500).json({ message: "Failed to toggle" });
    }
  });

  // Todos
  app.get(api.todos.list.path, requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const todos = await storage.getTodos(userId);
    res.json(todos);
  });

  app.post(api.todos.create.path, requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const input = api.todos.create.input.parse(req.body);
      const todo = await storage.createTodo({ ...input, userId });
      res.status(201).json(todo);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Validation error" });
      throw err;
    }
  });

  app.put(api.todos.update.path, requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getTodo(id);
    if (!existing || existing.userId !== getUserId(req)) {
      return res.status(404).json({ message: "Todo not found" });
    }
    try {
      const input = api.todos.update.input.parse(req.body);
      const updated = await storage.updateTodo(id, input);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.delete(api.todos.delete.path, requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getTodo(id);
    if (!existing || existing.userId !== getUserId(req)) {
      return res.status(404).json({ message: "Todo not found" });
    }
    await storage.deleteTodo(id);
    res.sendStatus(204);
  });

  // Scheduled items for a given date
  app.get(api.items.scheduled.path, requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const scheduled = await storage.getScheduledItems(userId, date);
    res.json(scheduled);
  });

  // Backlog todos
  app.get("/api/items/backlog", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const backlog = await storage.getBacklogTodos(userId);
    res.json(backlog);
  });

  // Convert item type
  app.post(api.items.convert.path, requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getItem(id);
    if (!existing || existing.userId !== getUserId(req)) {
      return res.status(404).json({ message: "Item not found" });
    }
    try {
      const { type: newType } = api.items.convert.input.parse(req.body);
      if (existing.type === newType) {
        return res.status(400).json({ message: "Item is already that type" });
      }
      const validConversions: Record<string, string[]> = {
        todo: ["habit", "event"],
        event: ["habit"],
        habit: ["todo"],
      };
      if (!validConversions[existing.type]?.includes(newType)) {
        return res.status(400).json({ message: `Cannot convert ${existing.type} to ${newType}` });
      }
      const converted = await storage.convertItem(id, newType);
      res.json(converted);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid type" });
      res.status(500).json({ message: "Failed to convert item" });
    }
  });

  return httpServer;
}
