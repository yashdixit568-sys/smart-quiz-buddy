import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, LogOut, LayoutDashboard, Sparkles, UserCheck, Sun, Moon } from "lucide-react";
import { isGuestUser, clearGuestSession } from "@/lib/quizUtils";
import { useTheme } from "next-themes";

interface NavbarProps {
  userEmail?: string;
  userId?: string;
}

const Navbar = ({ userEmail, userId }: NavbarProps) => {
  const navigate = useNavigate();
  const isGuest = isGuestUser(userId);
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    if (isGuest) {
      clearGuestSession();
    } else {
      await supabase.auth.signOut();
    }
    navigate("/auth");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-200">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition-transform group-hover:scale-105">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                SmartQuiz<span className="text-blue-600 dark:text-blue-400">Buddy</span>
              </span>
              <Badge variant="outline" className="hidden sm:inline-flex text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
                Pro
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">CS Mock Test & Interview Prep</p>
          </div>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
          </Link>

          {/* Theme Switcher Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 h-9 w-9"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </Button>

          {/* User / Guest Status */}
          {isGuest ? (
            <Badge className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 py-1 px-2.5">
              <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span>Demo Mode</span>
            </Badge>
          ) : userEmail ? (
            <Badge variant="outline" className="hidden md:flex items-center gap-1.5 py-1 px-2.5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm">
              <UserCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span className="max-w-[150px] truncate">{userEmail}</span>
            </Badge>
          ) : null}

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{isGuest ? "Exit Demo" : "Logout"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
