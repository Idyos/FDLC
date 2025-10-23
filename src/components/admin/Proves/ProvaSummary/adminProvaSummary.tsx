import { motion } from "framer-motion";
import { PenyaInfo, ProvaSummary } from "@/interfaces/interfaces";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTheme } from "@/components/Theme/theme-provider";
import { useState } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { updatePenyaInfo } from "@/services/database/adminDbServices";

interface ProvaSummaryProps {
  provaSummary: ProvaSummary | null;
}

export default function AdminProvaSummary({ provaSummary }: ProvaSummaryProps) {
  const { theme } = useTheme();
  const [provaName, setProvaName] = useState(provaSummary?.name || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return provaSummary != null ? (
    <p>aa</p>
  ) : (
    <p>oo</p>
  );
}

