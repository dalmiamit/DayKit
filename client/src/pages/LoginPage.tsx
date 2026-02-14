import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sun, Mail } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { signInWithGoogle, signUpWithEmail, signInWithEmail, syncFirebaseSession, isFirebaseConfigured } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [modalIntent, setModalIntent] = useState<"signup" | "signin">("signup");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const openModal = (intent: "signup" | "signin") => {
    setModalIntent(intent);
    setIsSignUp(intent === "signup");
    setAuthModalOpen(true);
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      const user = await signInWithGoogle();
      await syncFirebaseSession(user);
      window.location.href = "/";
    } catch (error) {
      console.error("Google auth error:", error);
      toast({
        title: "Sign in failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    
    setIsLoading(true);
    try {
      let user;
      if (isSignUp) {
        user = await signUpWithEmail(email, password);
      } else {
        user = await signInWithEmail(email, password);
      }
      await syncFirebaseSession(user);
      window.location.href = "/";
    } catch (error: any) {
      console.error("Email auth error:", error);
      let message = "Please try again.";
      if (error.code === "auth/email-already-in-use") {
        message = "This email is already registered. Try signing in instead.";
      } else if (error.code === "auth/weak-password") {
        message = "Password should be at least 6 characters.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        message = "Invalid email or password.";
      }
      toast({
        title: isSignUp ? "Sign up failed" : "Sign in failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetModal = () => {
    setShowEmailForm(false);
    setEmail("");
    setPassword("");
  };

  const handleOpenChange = (open: boolean) => {
    setAuthModalOpen(open);
    if (!open) {
      resetModal();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50/50 to-teal-50/30 font-sans">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-between px-6 py-12 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
            <Sun className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">Daykit</span>
        </div>

        {/* Main content */}
        <div className="space-y-10 -mt-12">
          <div className="space-y-4">
            <h1 className="font-display text-4xl font-semibold leading-snug tracking-tight text-foreground lg:text-5xl">
              A quiet place for your day.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
              Daykit helps you keep track of what you want to do — without noise or complexity.
            </p>
          </div>

          <div className="space-y-3 text-foreground/80">
            <p>Keep track of daily tasks.</p>
            <p>Build habits you can maintain.</p>
            <p>See your day at a glance.</p>
          </div>

          <div className="pt-2 space-y-3">
            <Button 
              size="lg" 
              className="rounded-xl px-8 text-base shadow-sm"
              data-testid="button-signup"
              onClick={() => openModal("signup")}
            >
              Get started
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button 
                className="underline underline-offset-2 hover:text-foreground transition-colors"
                data-testid="button-signin"
                onClick={() => openModal("signin")}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-muted-foreground/60">
          © {new Date().getFullYear()} Daykit
        </div>
      </div>

      {/* Auth Modal */}
      <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="font-display text-xl">
              {modalIntent === "signup" ? "Get started with Daykit" : "Sign in to Daykit"}
            </DialogTitle>
            <DialogDescription>
              {modalIntent === "signup" ? "A quiet place for your day." : "Welcome back."}
            </DialogDescription>
          </DialogHeader>

          {showEmailForm ? (
            <form onSubmit={handleEmailSubmit} className="pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-email"
                  className="rounded-xl"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  data-testid="input-password"
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setShowEmailForm(false)}
                  disabled={isLoading}
                  data-testid="button-back"
                >
                  Back
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 rounded-xl"
                  disabled={isLoading || !email.trim() || !password.trim()}
                  data-testid="button-submit-email"
                >
                  {isLoading ? "Please wait..." : (isSignUp ? "Sign up" : "Sign in")}
                </Button>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {isSignUp ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                      onClick={() => setIsSignUp(false)}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-foreground transition-colors"
                      onClick={() => setIsSignUp(true)}
                    >
                      Sign up
                    </button>
                  </>
                )}
              </div>
            </form>
          ) : (
            <div className="pt-4 space-y-3">
              {!isFirebaseConfigured ? (
                <p className="text-sm text-muted-foreground text-center">
                  Authentication is not configured yet.
                </p>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full rounded-xl text-base gap-3"
                    data-testid="button-google-auth"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                  >
                    <SiGoogle className="h-4 w-4" />
                    Continue with Google
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full rounded-xl text-base gap-3"
                    data-testid="button-email-auth"
                    onClick={() => setShowEmailForm(true)}
                    disabled={isLoading}
                  >
                    <Mail className="h-4 w-4" />
                    Continue with email
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
