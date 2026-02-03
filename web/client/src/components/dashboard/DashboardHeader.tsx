import type { ApiUser } from "@/lib/auth-api";
import { Search, Bell, Settings, LogOut, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  user: ApiUser | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSignOut: () => void;
}

export function DashboardHeader({
  user,
  searchQuery,
  onSearchChange,
  onSignOut,
}: DashboardHeaderProps) {
  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 flex h-14 md:h-16 w-full items-center gap-2 md:gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-6 shrink-0">
      <SidebarTrigger className="-ml-1 flex-shrink-0" />

      {/* Search Bar */}
      <div className="flex-1 min-w-0 max-w-lg">
        <div className="relative">
          <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 md:pl-10 h-9 md:h-10 bg-muted/50 border-0 focus-visible:ring-1 text-sm w-full"
          />
        </div>
      </div>

      {/* Right side actions - pushed to far right */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-auto">
        <Button variant="default" size="sm" className="gap-1 md:gap-2 h-8 md:h-9 px-2 md:px-3">
          <UserPlus className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
          <span className="hidden sm:inline text-xs md:text-sm">Invite Team</span>
        </Button>

        <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-9 md:w-9 flex-shrink-0">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-destructive rounded-full" />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 md:h-9 md:w-9 rounded-full">
              <Avatar className="h-8 w-8 md:h-9 md:w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-sm">{user?.email}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
