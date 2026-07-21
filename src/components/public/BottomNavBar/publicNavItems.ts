import { Trophy, Flag, Megaphone } from "lucide-react";
import type { BottomNavItem } from "./bottomNavBar";

export const publicNavItems: BottomNavItem[] = [
  { label: "Ranking", icon: Trophy },
  { label: "Proves", icon: Flag },
  { label: "Comunicats", icon: Megaphone },
];
