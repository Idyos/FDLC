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

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedYear } = useYear();
  const { user, signOut } = useAuth();

  const [proves, setProves] = useState<Prova[]>([]);
  const [penyes, setPenyes] = useState<PenyaInfo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [penyaFilter, setPenyaFilter] = useState("");

  const isInitialYearMount = useRef(true);

  console.log(user);

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
            <YearSelector />
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
            <Collapsible defaultOpen className="group/collapsible-proves">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center pr-8">
                    <Trophy className="mr-2 h-4 w-4" />
                    Proves
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible-proves:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <SidebarGroupAction
                  title="Crear nova prova"
                  onClick={() => navigate("/admin/createProva")}
                >
                  <Plus />
                  <span className="sr-only">Crear nova prova</span>
                </SidebarGroupAction>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {proves.map((prova) => (
                        <AdminProvaContextMenu
                          key={prova.id}
                          prova={prova}
                          year={selectedYear}
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

            {/* Penyes */}
            <Collapsible defaultOpen className="group/collapsible-penyes">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center pr-8">
                    <Flag className="mr-2 h-4 w-4" />
                    Penyes
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible-penyes:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <AdminAddPenya
                  triggerElement={
                    <SidebarGroupAction title="Crear nova penya">
                      <Plus />
                      <span className="sr-only">Crear nova penya</span>
                    </SidebarGroupAction>
                  }
                />
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

            {/* Usuaris (placeholder) */}
            <Collapsible className="group/collapsible-usuaris">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="flex w-full items-center pr-8">
                    <Users className="mr-2 h-4 w-4" />
                    Usuaris
                    <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible-usuaris:rotate-180" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <AdminAddUser triggerElement={
                  <SidebarGroupAction title="Crear nou usuari">
                    <Plus />
                    <span className="sr-only">Crear nou usuari</span>
                  </SidebarGroupAction>
                } />
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {users.map((u) => (
                        <AdminUserContextMenu
                          key={u.uid}
                          user={u}
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
