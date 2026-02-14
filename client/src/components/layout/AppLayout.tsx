import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Sun, CheckSquare, Calendar as CalendarIcon, ListTodo, LogOut, Loader2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const navItems = [
    { title: "Today", url: "/", icon: Sun },
    { title: "Habits", url: "/habits", icon: CheckSquare },
    { title: "To-Dos", url: "/todos", icon: ListTodo },
    { title: "Calendar", url: "/calendar", icon: CalendarIcon },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground font-sans">
        <Sidebar variant="inset" className="border-r border-border/30 bg-gradient-to-b from-sky-50/50 to-teal-50/30">
          <SidebarHeader className="p-4 md:p-6">
            <div className="flex items-center gap-2 px-2">
              <div className="h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shadow-sm">D</div>
              <span className="font-display font-semibold text-lg tracking-tight">Daykit</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        isActive={location === item.url}
                        className="transition-all duration-200 hover:translate-x-1"
                      >
                        <Link href={item.url} className="flex items-center gap-3 font-medium">
                          <item.icon className="h-4 w-4 opacity-70" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border/50">
            <div className="flex items-center gap-3 px-2 py-2 mb-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{user?.firstName || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-destructive" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
