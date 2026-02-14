import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Check Replit Auth first
      if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const user = await authStorage.getUser(userId);
        return res.json(user);
      }
      
      // Check Firebase session (cookie-based)
      if (req.session?.firebaseUser) {
        const fbUser = req.session.firebaseUser;
        return res.json({
          id: `firebase:${fbUser.uid}`,
          email: fbUser.email,
          firstName: fbUser.name?.split(" ")[0] || null,
          lastName: fbUser.name?.split(" ").slice(1).join(" ") || null,
          profileImageUrl: fbUser.picture || null,
        });
      }
      
      res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
