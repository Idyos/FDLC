import { useMemo, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Home, LogOut, Plus, Users } from "lucide-react";

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
import { navigateWithQuery } from "@/utils/url";
import { getPenyes, getProves } from "@/services/database/Admin/adminDbServices";
import { Prova, PenyaInfo } from "@/interfaces/interfaces";
import YearSelector from "@/components/public/yearSelector";
import AdminPenyaSummary from "@/components/admin/Penyes/PenyaSummary/adminPenyaSummary";
import AdminAddPenya from "@/components/admin/Penyes/AddPenya/adminAddPenya";
import AdminAddUser from "./Users/AddUser/AdminAddUser";
import { User } from "@/interfaces/userInterface";
import { getUsers } from "@/services/usersService";

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
                        <SidebarMenuItem key={prova.id}>
                          <SidebarMenuButton
                            onClick={() =>
                              navigateWithQuery(navigate, "/admin/prova", {
                                provaId: prova.id,
                              })
                            }
                          >
                            {prova.name}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
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
                        <SidebarMenuItem key={penya.id}>
                          <AdminPenyaSummary
                            rankingInfo={penya}
                            triggerElement={
                              <SidebarMenuButton>
                                {penya.name}
                              </SidebarMenuButton>
                            }
                          />
                        </SidebarMenuItem>
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
                      {users.map((user) => (
                        <SidebarMenuItem key={user.uid}>
                          <SidebarMenuButton>
                            {user.email}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
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
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {user?.email}
              </span>
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
