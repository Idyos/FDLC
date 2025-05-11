import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { CalendarDays, CheckIcon, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
    const navigate = useNavigate();
    const [peyesCount, setPeyesCount] = useState(0);
    const [provesCount, setProvesCount] = useState(0);
    const [completedProves, setCompletedProves] = useState(0);
    const [nextProva, setNextProva] = useState<string | null>(null);

  useEffect(() => {
    setPeyesCount(12);
    setProvesCount(8);
    setCompletedProves(5);
    setNextProva("Tira la cuerda - 15/07/2025");
  }, []);

  const handleClick = (direction: string) => {
    navigate(`/admin/${direction}`);
  };

  return (
    <>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem className="hover: cursor-pointer">
            <NavigationMenuLink onClick={() => handleClick("penyes")}>
              Penyes
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem className="hover: cursor-pointer">
            <NavigationMenuLink onClick={() => handleClick("proves")}>
              Proves
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Peñas registradas</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{peyesCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Pruebas creadas</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{provesCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Pruebas completadas</CardTitle>
          <CheckIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedProves}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Próxima prueba</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-md font-semibold text-muted-foreground">
            {nextProva || "Sin próximas pruebas"}
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
