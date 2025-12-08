// src/components/ui/sidebar.tsx
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import Image from "next/image";
import {
  ChevronDown,
  Home as HomeIcon,
  Zap,
  Calendar,
  Link2,
  FolderOpen,
  Shield,
  HelpCircle,
  Crown,
  Menu,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  Trash,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/axios";
import { WORKSPACE_URLS } from "@/lib/urls";
import toast from "react-hot-toast";

// Merged and corrected Workspace interface
export interface Workspace {
  workspace_id: string; // Corrected to match API response
  name: string;
  created_at: string;
  updated_at: string;
}

// User interface from localStorage
interface User {
    id: string; // Or number, depending on what your API returns for user ID
    [key: string]: any;
}


// --- SidebarItem Component ---
interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
  isCollapsed?: boolean;
  disabled?: boolean;
}

const SidebarItem = ({ icon, label, href, isActive, onClick, className, isCollapsed = false, disabled = false }: SidebarItemProps) => {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    if (disabled) return;
    if (onClick) {
      onClick();
    } else {
      router.push(href);
    }
  };

  const isCurrentActive = isActive || pathname === href;

  const buttonContent = (
    <Button
      variant="ghost"
      className={cn(
        "w-full transition-colors py-2 flex",
        isCollapsed
          ? "justify-center px-2"
          : "justify-start gap-2 px-2",
        "text-sm font-normal items-center",
        disabled
          ? "cursor-not-allowed text-gray-400 opacity-50"
          : "cursor-pointer text-gray-900 hover:!bg-gray-200 hover:!text-gray-900",
        isCurrentActive && !disabled && "bg-[#DFDFDF] hover:!bg-[#DFDFDF]", // Active state style
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
      {!isCollapsed && <span className="flex items-center">{label}</span>}
    </Button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return buttonContent;
};

// --- SidebarSection Component ---
const SidebarSection = ({ title, children, className, isCollapsed = false }: { title: string; children: React.ReactNode; className?: string; isCollapsed?: boolean }) => (
  <div className={cn("w-full", className)}>
    {!isCollapsed && (
      <div className="px-5 py-3">
        <span className="text-xs font-normal text-gray-600 leading-[14px] tracking-[-0.16px]">{title}</span>
      </div>
    )}
    <div className={cn("flex flex-col gap-2", isCollapsed ? "px-2 pb-4" : "px-3 pb-4")}>
      {children}
    </div>
  </div>
);

// --- Main Sidebar Component ---
interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  return (
    <>
      {/* Mobile Sidebar Trigger (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50 bg-white border border-gray-200" // Button to open mobile sidebar
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[248px] p-0">
          {/* Mobile Sidebar Content */}
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className={cn("hidden md:flex flex-col bg-[#F3F3F3] transition-all duration-300 h-full",
        isCollapsed ? "w-16" : "w-[248px]", // Dynamic width based on collapsed state
        className
      )}>
        {/* Desktop Sidebar Content */}
        <SidebarContent isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
      </div>
    </>
  );
}

// --- SidebarContent Component (Contains the actual sidebar structure) ---
interface SidebarContentProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

function SidebarContent({ isCollapsed = false, onToggleCollapse }: SidebarContentProps) {
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = React.useState<Workspace | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [modalMode, setModalMode] = React.useState<"create" | "edit">("create");
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [workspaceToEdit, setWorkspaceToEdit] = React.useState<Workspace | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(false); // Loading state for API calls

  // --- Fetch User Data ---
  React.useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  // --- Fetch Workspaces ---
  const fetchWorkspaces = React.useCallback(async () => {
    if (!user || !user.id) return; // Don't fetch if user data isn't loaded yet
    setIsLoading(true);
    try {
      // Use the correct URL function, passing the user ID
      const { data } = await api.get(WORKSPACE_URLS.GET_WORKSPACES(user.id));
      const fetchedWorkspaces = data.results || [];
      setWorkspaces(fetchedWorkspaces);

      // Select workspace logic (check localStorage first, then default)
      if (fetchedWorkspaces.length > 0) {
        const currentWorkspaceStr = localStorage.getItem("selectedWorkspace");
        let workspaceToSelect = fetchedWorkspaces[0]; // Default to first
        if (currentWorkspaceStr) {
          try {
              const currentWorkspace = JSON.parse(currentWorkspaceStr);
              const found = fetchedWorkspaces.find((w: Workspace) => w.workspace_id === currentWorkspace.workspace_id);
              if (found) {
                  workspaceToSelect = found;
              } else {
                  // If stored workspace not found (deleted?), default to first and update storage
                  localStorage.setItem("selectedWorkspace", JSON.stringify(fetchedWorkspaces[0]));
              }
          } catch(e) {
              console.error("Failed to parse selected workspace from localStorage", e);
              // Default to first workspace if parsing fails
              localStorage.setItem("selectedWorkspace", JSON.stringify(fetchedWorkspaces[0]));
          }
        } else {
            // If nothing in storage, store the default (first) one
             localStorage.setItem("selectedWorkspace", JSON.stringify(fetchedWorkspaces[0]));
        }
        setSelectedWorkspace(workspaceToSelect);
      } else {
        // No workspaces found
        setSelectedWorkspace(null);
        localStorage.removeItem("selectedWorkspace");
      }
    } catch (err) {
      console.error("Failed to fetch workspaces:", err);
      toast.error("Could not load workspaces.");
    } finally {
        setIsLoading(false);
    }
  }, [user]); // Re-run fetchWorkspaces when user data changes

  // Trigger fetchWorkspaces when user data is available
  React.useEffect(() => {
    if (user && user.id) {
      fetchWorkspaces();
    }
  }, [user, fetchWorkspaces]); // Depend on user and the memoized fetch function

  // --- Workspace CRUD Handlers ---
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      setError("Workspace name cannot be empty.");
      return;
    }
    // Check for duplicate names (case-insensitive)
    if (workspaces.some(workspace => workspace.name.toLowerCase() === newWorkspaceName.trim().toLowerCase())) {
      setError("A workspace with this name already exists.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.post(WORKSPACE_URLS.CREATE_WORKSPACE, { name: newWorkspaceName.trim() });
      const newWorkspace = response.data; // Assume API returns the created workspace
      toast.success("Workspace created successfully!");
      setIsModalOpen(false);
      setNewWorkspaceName("");
      // Add the new workspace locally and select it
      setWorkspaces(prev => [...prev, newWorkspace]);
      handleWorkspaceSelect(newWorkspace); // Select the newly created workspace

      // // Or refetch all workspaces (simpler but might cause flicker)
      // await fetchWorkspaces();
    } catch (err: any) {
      console.error("Failed to create workspace:", err);
      const errorMsg = err.response?.data?.name?.[0] || "Failed to create workspace.";
      toast.error(errorMsg);
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateWorkspace = async () => {
    if (!workspaceToEdit || !newWorkspaceName.trim()) {
      setError("Workspace name cannot be empty.");
      return;
    }
    // Check for duplicate names (excluding the one being edited)
    if (workspaces.some(w => w.name.toLowerCase() === newWorkspaceName.trim().toLowerCase() && w.workspace_id !== workspaceToEdit.workspace_id)) {
      setError("A workspace with this name already exists.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.put(WORKSPACE_URLS.UPDATE_WORKSPACE(workspaceToEdit.workspace_id), { name: newWorkspaceName.trim() });
      const updatedWorkspace = response.data; // Assume API returns the updated workspace
      toast.success("Workspace updated successfully!");
      setIsModalOpen(false);
      setNewWorkspaceName("");

      // Update local state
      setWorkspaces(prev => prev.map(w => w.workspace_id === updatedWorkspace.workspace_id ? updatedWorkspace : w));
      // Update selected workspace if it was the one edited
      if (selectedWorkspace?.workspace_id === updatedWorkspace.workspace_id) {
          setSelectedWorkspace(updatedWorkspace);
          localStorage.setItem("selectedWorkspace", JSON.stringify(updatedWorkspace));
      }
      setWorkspaceToEdit(null); // Clear editing state

      // // Or refetch all
      // await fetchWorkspaces();

    } catch (err: any) {
      console.error("Failed to update workspace:", err);
      const errorMsg = err.response?.data?.name?.[0] || "Failed to update workspace.";
      toast.error(errorMsg);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
     // Optional: Add a confirmation dialog before deleting
     if (!window.confirm("Are you sure you want to delete this workspace? This cannot be undone.")) {
         return;
     }

    setIsLoading(true);
    try {
      await api.delete(WORKSPACE_URLS.DELETE_WORKSPACE(workspaceId));
      toast.success("Workspace deleted successfully!");

      // Update local state: remove the deleted workspace
      const remainingWorkspaces = workspaces.filter(w => w.workspace_id !== workspaceId);
      setWorkspaces(remainingWorkspaces);

      // If the deleted workspace was selected, select the first remaining one or null
      if (selectedWorkspace?.workspace_id === workspaceId) {
          const newSelected = remainingWorkspaces.length > 0 ? remainingWorkspaces[0] : null;
          setSelectedWorkspace(newSelected);
          if (newSelected) {
              localStorage.setItem("selectedWorkspace", JSON.stringify(newSelected));
          } else {
              localStorage.removeItem("selectedWorkspace");
          }
      }
      // // Or refetch all (simpler)
      // await fetchWorkspaces();

    } catch (err) {
      console.error("Failed to delete workspace:", err);
      toast.error("Failed to delete workspace.");
    } finally {
        setIsLoading(false);
    }
  };

  // --- Workspace Selection ---
  const handleWorkspaceSelect = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    localStorage.setItem("selectedWorkspace", JSON.stringify(workspace));
    // Optional: Maybe reload the page or trigger data refresh based on workspace change
    // window.location.reload(); // Simple reload
  };

  // --- Modal Control ---
  const openModal = (mode: "create" | "edit", workspace?: Workspace) => {
    setModalMode(mode);
    setError(null); // Clear previous errors
    if (mode === "edit" && workspace) {
      setWorkspaceToEdit(workspace);
      setNewWorkspaceName(workspace.name);
    } else {
      setNewWorkspaceName("");
      setWorkspaceToEdit(null);
    }
    setIsModalOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Logo and Collapse Button */}
        <div className="bg-[#F3F3F3] flex items-center justify-between px-5 py-4 flex-shrink-0">
          {!isCollapsed && (
            <div className="w-[99.79px] flex items-center justify-center">
              {/* Ensure the logo path is correct relative to the public folder */}
              <Image
                src="/Go Post Logo.svg"
                alt="Go Post Logo"
                width={99.79}
                height={20}
                className="w-full h-full"
              />
            </div>
          )}
          {/* Collapse Toggle Button */}
          {onToggleCollapse && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="w-6 h-6 hover:!bg-gray-200 cursor-pointer items-center justify-center flex p-0" // Adjusted size and padding
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right"> {/* Ensure TooltipContent is rendered */}
                <p>{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Scrollable Area */}
        <ScrollArea className="flex-1">
          {/* Workspace Selector Dropdown */}
          <div className="w-full pt-2 pr-3 pb-2 pl-3 flex items-center">
            {!isCollapsed ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full gap-2 rounded-lg p-2 bg-white shadow-[0px_0px_0px_1px_rgba(0,0,29,0.1)_inset] flex items-center justify-between hover:!bg-gray-50 cursor-pointer"
                  >
                    <span className="text-sm font-medium text-gray-900 leading-5 truncate"> {/* Added truncate */}
                      {selectedWorkspace ? selectedWorkspace.name : "Select Workspace"}
                    </span>
                    <ChevronDown size={16} color="#5B5B64" className="opacity-50 flex-shrink-0" /> {/* Added flex-shrink-0 */}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {/* Create New Workspace Item */}
                  <DropdownMenuItem onSelect={() => openModal("create")} className="cursor-pointer">
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create New Workspace</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Workspace List Items */}
                  {isLoading ? (
                     <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                  ) : workspaces.length === 0 ? (
                      <DropdownMenuItem disabled>No workspaces found</DropdownMenuItem>
                  ) : (
                      workspaces.map((workspace) => (
                        <DropdownMenuItem
                            key={workspace.workspace_id}
                            onSelect={() => handleWorkspaceSelect(workspace)}
                            className="cursor-pointer flex justify-between items-center"
                            disabled={isLoading} // Disable during actions
                        >
                          <span className="truncate flex-1 mr-2">{workspace.name}</span>
                          <div className="flex items-center flex-shrink-0">
                            {/* Edit Button */}
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openModal("edit", workspace)}}>
                              <Edit className="h-3 w-3" /> {/* Smaller icon */}
                            </Button>
                            {/* Delete Button (Consider disabling delete for the only workspace) */}
                            <Button
                                variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(workspace.workspace_id)}}
                                disabled={isLoading || workspaces.length <= 1} // Disable if loading or only one workspace
                            >
                              <Trash className="h-3 w-3" /> {/* Smaller icon */}
                            </Button>
                          </div>
                        </DropdownMenuItem>
                      ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
                // Collapsed Workspace Button (Tooltip)
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* Needs DropdownMenu for functionality even when collapsed */}
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="w-full gap-2 rounded-lg p-2 bg-white shadow-[0px_0px_0px_1px_rgba(0,0,29,0.1)_inset] flex items-center justify-center hover:!bg-gray-50 cursor-pointer"
                        >
                            {/* Placeholder Icon or first letter */}
                            {selectedWorkspace ? selectedWorkspace.name.charAt(0).toUpperCase() : '?'}
                        </Button>
                      </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" side="right" className="w-56"> {/* Opens to the right */}
                          {/* Replicate items from expanded view */}
                          <DropdownMenuItem onSelect={() => openModal("create")} className="cursor-pointer">
                            <Plus className="mr-2 h-4 w-4" /> <span>Create New</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isLoading ? ( <DropdownMenuItem disabled>Loading...</DropdownMenuItem> ) :
                           workspaces.map((workspace) => (
                            <DropdownMenuItem key={workspace.workspace_id} onSelect={() => handleWorkspaceSelect(workspace)} className="cursor-pointer flex justify-between items-center">
                              <span className="truncate flex-1 mr-2">{workspace.name}</span>
                               <div className="flex items-center flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openModal("edit", workspace)}}> <Edit className="h-3 w-3" /> </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeleteWorkspace(workspace.workspace_id)}} disabled={isLoading || workspaces.length <= 1}> <Trash className="h-3 w-3" /> </Button>
                              </div>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                   </DropdownMenu>
                </TooltipTrigger>
                <TooltipContent side="right">
                    {/* Tooltip text */}
                  <p>{selectedWorkspace ? selectedWorkspace.name : "Select Workspace"}</p>
                   {/* Add "(Click to manage)" or similar hint */}
                   <p className="text-xs text-muted-foreground">(Click to manage)</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Create/Edit Workspace Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{modalMode === "create" ? "Create New Workspace" : "Edit Workspace"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    className="col-span-3"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && (modalMode === 'create' ? handleCreateWorkspace() : handleUpdateWorkspace())} // Submit on Enter
                  />
                </div>
                {error && <p className="text-red-500 text-sm col-span-4 text-center">{error}</p>}
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" onClick={modalMode === "create" ? handleCreateWorkspace : handleUpdateWorkspace} disabled={isLoading}>
                  {isLoading ? (modalMode === 'create' ? "Creating..." : "Saving...") : (modalMode === "create" ? "Create Workspace" : "Save Changes")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          {/* Navigation Sections */}
          <SidebarSection title="Create" isCollapsed={isCollapsed}>
            <SidebarItem
              icon={<HomeIcon size={16} color="#5B5B64" />}
              label="Home"
              href="/home"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              icon={<Zap size={16} color="#5B5B64" strokeWidth={2.5} />}
              label="Agent"
              href="/agents/list" // Link to agent list page
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              icon={<Calendar size={16} color="#5B5B64" />}
              label="Calendar"
              href="/calendar"
              isCollapsed={isCollapsed}
              disabled={true} // Keep disabled for now
            />
          </SidebarSection>

          {!isCollapsed && <Separator className="mx-3" />}

          <SidebarSection title="Manage" isCollapsed={isCollapsed}>
            <SidebarItem
              icon={<Link2 size={16} color="#5B5B64" />}
              label="Connections"
              href="/connections"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              icon={<FolderOpen size={16} color="#5B5B64" />}
              label="Library"
              href="/library" // Updated href
              isCollapsed={isCollapsed}
              disabled={false} // Enabled
            />
          </SidebarSection>

          {!isCollapsed && <Separator className="mx-3" />}

          {/* Bottom Section (Affiliate, Support, Plan) */}
          <div className="mt-auto pt-4"> {/* Use mt-auto to push to bottom */}
            <div className={cn("flex flex-col gap-2", isCollapsed ? "px-2 pb-4" : "px-3 pb-4")}>
              <SidebarItem
                icon={<Shield size={16} color="#5B5B64" />}
                label="Affiliate"
                href="/affiliate"
                isCollapsed={isCollapsed}
                disabled={true}
              />
              <SidebarItem
                icon={<HelpCircle size={16} color="#5B5B64" />}
                label="Support"
                href="/support"
                isCollapsed={isCollapsed}
                disabled={true}
              />

              {/* Plan Information */}
              {!isCollapsed ? (
                // Expanded View
                <div className="w-full gap-1.5 rounded-lg p-2 bg-white shadow-[0px_0px_4px_2px_rgba(255,255,255,1),0px_5px_12px_-4px_rgba(0,0,0,0.08),0px_0.5px_1px_0px_rgba(0,0,0,0.15)] flex flex-col mt-2">
                  <div className="w-fit pt-0.5 pr-1.5 pb-0.5 pl-1.5 gap-2.5 rounded bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-medium leading-[100%]" style={{ color: '#5B5B64' }}>Free Plan</span>
                  </div>

                  <div className="w-full justify-between pt-1.5 pr-2 pb-1.5 pl-2 rounded-lg flex items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-5 flex items-center justify-center">
                        <Image
                          src="/progress.svg" // Ensure this path is correct
                          alt="Progress Icon"
                          width={20}
                          height={20}
                          className="w-full h-full"
                        />
                      </div>
                      <span className="text-sm font-normal text-gray-900">Credits</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">75</span>
                      <span className="text-sm font-normal text-gray-900"> / 300</span>
                    </div>
                  </div>

                  <div className="w-full px-2">
                    <Progress value={25} className="h-2" /> {/* Example value */}
                  </div>

                  <Button className="w-full flex gap-2 rounded-lg border border-black/10 bg-[#FDE047] hover:bg-[#FDE047]/90 py-2 items-center justify-center mt-1">
                    <Crown size={16} color="#11110D" fill="#11110D" />
                    <span className="text-sm font-medium text-gray-900">Upgrade</span>
                  </Button>
                </div>
              ) : (
                // Collapsed View (Tooltip)
                <Tooltip>
                  <TooltipTrigger asChild>
                     <Button variant="ghost" className="w-full mt-2 rounded-lg bg-white shadow-[0px_0px_4px_2px_rgba(255,255,255,1),0px_5px_12px_-4px_rgba(0,0,0,0.08),0px_0.5px_1px_0px_rgba(0,0,0,0.15)] flex items-center justify-center py-2 px-0 hover:bg-gray-50">
                        <Crown size={16} color="#11110D" />
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Free Plan</p>
                    <p className="text-xs text-muted-foreground">75/300 credits used</p>
                    <p className="text-xs text-muted-foreground">(Click to upgrade)</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}