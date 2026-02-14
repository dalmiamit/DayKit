import admin from "firebase-admin";
import type { Request, Response, NextFunction } from "express";

let firebaseApp: admin.app.App | null = null;

export function initFirebaseAdmin(): void {
  if (firebaseApp) return;
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    console.warn("Firebase Admin: Missing FIREBASE_PROJECT_ID - Firebase auth will not work");
    return;
  }

  try {
    firebaseApp = admin.initializeApp({
      projectId,
    });
    console.log("Firebase Admin initialized");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
}

export async function verifyFirebaseToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
  if (!firebaseApp) {
    console.error("Firebase Admin not initialized");
    return null;
  }
  
  try {
    const decodedToken = await admin.auth(firebaseApp).verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("Failed to verify Firebase token:", error);
    return null;
  }
}

export function firebaseAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }
  
  const idToken = authHeader.substring(7);
  
  verifyFirebaseToken(idToken)
    .then((decodedToken) => {
      if (decodedToken) {
        (req as any).firebaseUser = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name,
          picture: decodedToken.picture,
        };
      }
      next();
    })
    .catch(() => {
      next();
    });
}

export function getFirebaseUserId(req: Request): string | null {
  return (req as any).firebaseUser?.uid || null;
}

export function isFirebaseAuthenticated(req: Request): boolean {
  return !!(req as any).firebaseUser;
}
