import { useMemo, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Flag, Home, LogOut, Plus, Users, Trophy } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useYear } from "@/components/shared/Contexts/YearContext";
import { useAuth } from "@/routes/admin/AuthContext";
import { getPenyes, getProves } from "@/services/database/Admin/adminDbServices";
import { Prova, PenyaInfo } from "@/interfaces/interfaces";
import YearSelector from "@/components/public/yearSelector";
import AdminAddPenya from "@/components/admin/Penyes/AddPenya/adminAddPenya";
import AdminAddUser from "./Users/AddUser/AdminAddUser";
import { User } from "@/interfaces/userInterface";
import { getUsers } from "@/services/usersService";
import AdminProvaContextMenu from "@/components/admin/Proves/SidebarItem/adminProvaContextMenu";
import AdminPenyaContextMenu from "@/components/admin/Penyes/SidebarItem/adminPenyaContextMenu";
import AdminUserContextMenu from "@/components/admin/Users/SidebarItem/AdminUserContextMenu";
import { ModeToggle } from "../Theme/mode-toggle";

function hasPerm(list: string[], ...perms: string[]): boolean {
  return list.includes("*") || perms.some((p) => list.includes(p));
}

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedYear } = useYear();
  const { user, userData, loading, signOut } = useAuth();

  const [proves, setProves] = useState<Prova[]>([]);
  const [penyes, setPenyes] = useState<PenyaInfo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [penyaFilter, setPenyaFilter] = useState("");

  const isInitialYearMount = useRef(true);

  // While loading: show nothing. Once resolved: use permissions or full access if no doc.
  const provesPerms = loading ? [] : (userData?.permissions.proves ?? ["*"]);
  const penyesPerms = loading ? [] : (userData?.permissions.penyes ?? ["*"]);
  const usersPerms = loading ? [] : (userData?.permissions.users ?? ["*"]);
  const specificProvaId = userData?.permissions.specificProvaId;

  const showProves = provesPerms.length > 0;
  const showPenyes = penyesPerms.length > 0;
  const showUsers = usersPerms.length > 0;

  const canCreateProva = hasPerm(provesPerms, "create");
  const canNavigateToProva = hasPerm(provesPerms, "editResults");
  const canEditProva = hasPerm(provesPerms, "editInfo");
  const canDeleteProva = hasPerm(provesPerms, "delete");

  const canCreatePenya = hasPerm(penyesPerms, "create");
  const canEditPenya = hasPerm(penyesPerms, "edit");
  const canDeletePenya = hasPerm(penyesPerms, "delete");

  const canCreateUser = hasPerm(usersPerms, "create");
  const canEditUser = hasPerm(usersPerms, "edit");
  const canDeleteUser = hasPerm(usersPerms, "delete");

  useEffect(() => {
    if (isInitialYearMount.current) {
      isInitialYearMount.current = false;
      return;
    }
    if (location.pathname === "/admin/prova") {
      navigate("/admin");
    }
  }, [selectedYear]);

  useEffect(() => {
    getProves(selectedYear, setProves);
    getPenyes(selectedYear, setPenyes);
    getUsers(setUsers);
    setPenyaFilter("");
  }, [selectedYear]);

  const visibleProves = useMemo(
    () => specificProvaId ? proves.filter((p) => p.id === specificProvaId) : proves,
    [proves, specificProvaId]
  );

  const filteredPenyes = useMemo(
    () =>
      penyes.filter((p) =>
        p.name.toLowerCase().includes(penyaFilter.toLowerCase())
      ),
    [penyes, penyaFilter]
  );

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar>
          {/* ── Header ──────────────────────────────────────── */}
          <SidebarHeader className="gap-2 p-3">
            <span className="text-sm font-semibold px-1">
              Circuit {selectedYear}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <YearSelector />
              </div>
              <ModeToggle />
            </div>
          </SidebarHeader>

          {/* ── Content ─────────────────────────────────────── */}
          <SidebarContent>
            {/* Dashboard link */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate("/admin")}>
                      <Home />
                      Dashboard
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Proves */}
            {showProves && (
              <Collapsible defaultOpen className="group/collapsible-proves">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className={`flex w-full items-center ${canCreateProva ? "pr-8" : "pr-2"}`}>
                      <Trophy className="mr-2 h-4 w-4" />
                      Proves
                      <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible-proves:rotate-180" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  {canCreateProva && (
                    <SidebarGroupAction
                      title="Crear nova prova"
                      onClick={() => navigate("/admin/createProva")}
                    >
                      <Plus />
                      <span className="sr-only">Crear nova prova</span>
                    </SidebarGroupAction>
                  )}
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {visibleProves.map((prova) => (
                          <AdminProvaContextMenu
                            key={prova.id}
                            prova={prova}
                            year={selectedYear}
                            canNavigate={canNavigateToProva}
                            canEdit={canEditProva}
                            canDelete={canDeleteProva}
                            onDeleted={(id) =>
                              setProves((prev) => prev.filter((p) => p.id !== id))
                            }
                          />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Penyes */}
            {showPenyes && (
              <Collapsible defaultOpen className="group/collapsible-penyes">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className={`flex w-full items-center ${canCreatePenya ? "pr-8" : "pr-2"}`}>
                      <Flag className="mr-2 h-4 w-4" />
                      Penyes
                      <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible-penyes:rotate-180" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  {canCreatePenya && (
                    <AdminAddPenya
                      triggerElement={
                        <SidebarGroupAction title="Crear nova penya">
                          <Plus />
                          <span className="sr-only">Crear nova penya</span>
                        </SidebarGroupAction>
                      }
                    />
                  )}
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <div className="px-2 pb-1">
                        <input
                          className="w-full rounded-md border bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="Cercar penya..."
                          value={penyaFilter}
                          onChange={(e) => setPenyaFilter(e.target.value)}
                        />
                      </div>
                      <SidebarMenu>
                        {filteredPenyes.map((penya) => (
                          <AdminPenyaContextMenu
                            key={penya.id}
                            penya={penya}
                            year={selectedYear}
                            canEdit={canEditPenya}
                            canDelete={canDeletePenya}
                            onDeleted={(id) =>
                              setPenyes((prev) => prev.filter((p) => p.id !== id))
                            }
                          />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}

            {/* Usuaris */}
            {showUsers && (
              <Collapsible className="group/collapsible-usuaris">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className={`flex w-full items-center ${canCreateUser ? "pr-8" : "pr-2"}`}>
                      <Users className="mr-2 h-4 w-4" />
                      Usuaris
                      <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible-usuaris:rotate-180" />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  {canCreateUser && (
                    <AdminAddUser triggerElement={
                      <SidebarGroupAction title="Crear nou usuari">
                        <Plus />
                        <span className="sr-only">Crear nou usuari</span>
                      </SidebarGroupAction>
                    } />
                  )}
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {users.map((u) => (
                          <AdminUserContextMenu
                            key={u.uid}
                            user={u}
                            canEdit={canEditUser}
                            canDelete={canDeleteUser}
                            onDeleted={(uid) =>
                              setUsers((prev) => prev.filter((x) => x.uid !== uid))
                            }
                            onUpdated={(updated) =>
                              setUsers((prev) =>
                                prev.map((x) => (x.uid === updated.uid ? updated : x))
                              )
                            }
                          />
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            )}
          </SidebarContent>

          {/* ── Footer ──────────────────────────────────────── */}
          <SidebarFooter className="p-3">
            <div className="flex items-center gap-2">
              {user?.photoURL ? (
                <div className="rounded-full w-10 h-10 bg-muted-foreground">
                </div>
              ) : null}

              <div className="flex flex-col flex-1 truncate text-xs text-muted-foreground">
                {user?.displayName ? (
                  <span className="font-medium text-sm text-foreground">
                    {user?.displayName}
                  </span>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                title="Tancar sessió"
                onClick={() => signOut()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* ── Main content ────────────────────────────────── */}
        <SidebarInset>
          <div className="flex items-center gap-2 border-b p-2">
            <SidebarTrigger />
          </div>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
