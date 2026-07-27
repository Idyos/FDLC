import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/routes/admin/AuthContext";
import { changeOwnPassword } from "@/services/usersService";

interface AdminChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function AdminChangePasswordDialog({
  open,
  onOpenChange,
  onSuccess,
}: AdminChangePasswordDialogProps) {
  const { userData } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.warning("La nova contrasenya ha de tenir almenys 6 caràcters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning("Les contrasenyes no coincideixen.");
      return;
    }

    setIsSaving(true);
    try {
      await changeOwnPassword(currentPassword, newPassword, userData?.isTemporary ?? false);
      toast.success("Contrasenya actualitzada correctament!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        toast.error("La contrasenya actual no és correcta.");
      } else if (error.code === "auth/too-many-requests") {
        toast.error("Massa intents. Torna-ho a provar més tard.");
      } else {
        toast.error("Error al canviar la contrasenya: " + (error.message ?? ""));
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Canviar contrasenya</DialogTitle>
          <DialogDescription>
            Introdueix la contrasenya actual i la nova contrasenya.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currentPassword">Contrasenya actual</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newPassword">Nova contrasenya</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="mínim 6 caràcters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">Confirma la nova contrasenya</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Guardant..." : "Canviar contrasenya"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
