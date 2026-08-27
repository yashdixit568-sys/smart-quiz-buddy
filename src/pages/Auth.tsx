import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Brain, Sparkles, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { createGuestSession, getStoredGuestUser } from "@/lib/quizUtils";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already signed in via Supabase or Guest
    const guest = getStoredGuestUser();
    if (guest) {
      navigate("/");
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast({
          title: "Success!",
          description: "Account created successfully. You can now login.",
        });
        setIsLogin(true);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Authentication error occurred";
      toast({
        title: "Authentication Error",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    createGuestSession();
    toast({
      title: "Welcome to Demo Mode!",
      description: "You're exploring SmartQuiz as a Guest. You can take tests and track progress.",
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-background text-foreground transition-colors duration-200 p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SmartQuiz Buddy</h1>
          <p className="text-sm text-slate-500">AI-Powered Computer Science Assessment & Interview Prep</p>
        </div>

        {/* Card */}
        <Card className="border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-slate-900">
              {isLogin ? "Sign in to your account" : "Create your account"}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {isLogin
                ? "Enter your credentials to access your mock test dashboard"
                : "Register with email to track long-term interview scores"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Quick Guest Access */}
            <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Want to test immediately without signing up?
              </div>
              <Button
                type="button"
                onClick={handleGuestLogin}
                variant="outline"
                className="w-full h-10 border-blue-200 bg-white hover:bg-blue-50 text-blue-700 font-medium text-xs justify-between"
              >
                <span>Continue as Guest / Demo Mode</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or continue with email</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white border-slate-200 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-white border-slate-200 text-sm"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Authenticating...
                  </>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-slate-600 hover:text-slate-900"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Footer Note */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Protected with secure Supabase Auth & JWT</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;