import { useState, useEffect } from "react";
import { auth, subscribeToAuthState, firebaseSignOut, type FirebaseUser } from "@/lib/firebase";

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export function useFirebaseAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const displayName = firebaseUser.displayName || "";
        const nameParts = displayName.split(" ");
        setUser({
          id: `firebase:${firebaseUser.uid}`,
          email: firebaseUser.email,
          firstName: nameParts[0] || null,
          lastName: nameParts.slice(1).join(" ") || null,
          profileImageUrl: firebaseUser.photoURL,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await firebaseSignOut();
    window.location.href = "/login";
  };

  const getIdToken = async (): Promise<string | null> => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    getIdToken,
  };
}
