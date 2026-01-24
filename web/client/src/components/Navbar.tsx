import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { LogOut, User as UserIcon, Home, Layout, Pencil, FileText } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";

export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full">
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate("/")}
            className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent"
          >
            DiagramGen
          </button>
          
          {user && (
            <div className="hidden md:block">
              <WorkspaceSwitcher />
            </div>
          )}
          
          {user && (
            <div className="hidden md:flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <Layout className="h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/editor")}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Editor
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/whiteboard")}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" />
                Whiteboard
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                {user.email}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate("/auth")}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};
