'use client';

import { Calendar, Home, Inbox, Search, Settings } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]

function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default function Page() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-gray-200" />
            <h1 className="font-semibold">Sidebar Demo</h1>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="aspect-video rounded-xl bg-muted/50 p-4">
              <h2 className="text-lg font-semibold">Card 1</h2>
              <p className="text-sm text-gray-600">This is a demo card to show the sidebar layout.</p>
            </div>
            <div className="aspect-video rounded-xl bg-muted/50 p-4">
              <h2 className="text-lg font-semibold">Card 2</h2>
              <p className="text-sm text-gray-600">Another demo card in the main content area.</p>
            </div>
            <div className="aspect-video rounded-xl bg-muted/50 p-4">
              <h2 className="text-lg font-semibold">Card 3</h2>
              <p className="text-sm text-gray-600">Third demo card to fill the grid layout.</p>
            </div>
          </div>
          <div className="min-h-screen flex-1 rounded-xl bg-muted/50 p-4">
            <h2 className="text-xl font-semibold mb-4">Main Content</h2>
            <p className="text-gray-600 mb-4">
              This is the main content area. You can use Ctrl/Cmd+B to toggle the sidebar.
            </p>
            <p className="text-gray-600">
              The sidebar should be collapsible and work on both desktop and mobile devices.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}