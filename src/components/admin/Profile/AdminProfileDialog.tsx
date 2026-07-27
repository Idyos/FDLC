import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/routes/admin/AuthContext";
import { changeOwnEmail, updateOwnDisplayName } from "@/services/usersService";
import AdminChangePasswordDialog from "./AdminChangePasswordDialog";

interface AdminProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GENERIC_PASSWORD_MASK_LENGTH = 8;

export default function AdminProfileDialog({ open, onOpenChange }: AdminProfileDialogProps) {
  const { user, userData } = useAuth();

  const isTemporary = userData?.isTemporary ?? false;
  const needsPasswordReset = !!userData && !userData.isTemporary && !userData.hasResetPassword;
  const originalEmail = userData?.email ?? user?.email ?? "";

  const [showWarning, setShowWarning] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const emailChanged = email.trim() !== originalEmail.trim();

  useEffect(() => {
    if (open) {
      setDisplayName(userData?.displayName ?? user?.displayName ?? "");
      setEmail(originalEmail);
      setCurrentPasswordForEmail("");
      setShowWarning(needsPasswordReset);
    }
  }, [open, needsPasswordReset]);

  const passwordMask = "•".repeat(
    userData?.passwordLength && userData.passwordLength > 0
      ? userData.passwordLength
      : GENERIC_PASSWORD_MASK_LENGTH
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      toast.warning("El nom no pot estar buit.");
      return;
    }
    if (emailChanged && !trimmedEmail) {
      toast.warning("El correu no pot estar buit.");
      return;
    }
    if (emailChanged && !currentPasswordForEmail) {
      toast.warning("Introdueix la contrasenya actual per canviar el correu.");
      return;
    }

    const nameChanged = trimmedName !== (userData?.displayName ?? "");

    setIsSavingProfile(true);
    try {
      if (nameChanged) {
        await updateOwnDisplayName(trimmedName, isTemporary);
      }

      if (emailChanged) {
        await changeOwnEmail(currentPasswordForEmail, trimmedEmail, isTemporary);
        toast.success(
          `S'ha enviat un correu de verificació a ${trimmedEmail}. El canvi s'aplicarà quan el confirmis.`
        );
        setEmail(originalEmail);
        setCurrentPasswordForEmail("");
      } else if (nameChanged) {
        toast.success("Perfil actualitzat correctament!");
      }
    } catch (error: any) {
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        toast.error("La contrasenya actual no és correcta.");
      } else if (error.code === "auth/email-already-in-use") {
        toast.error("Aquest correu ja està en ús.");
      } else {
        toast.error("Error al actualitzar el perfil: " + (error.message ?? ""));
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>El meu perfil</DialogTitle>
            <DialogDescription>Informació del compte i seguretat.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-1">
            {isTemporary ? (
              <>
                <Alert className="pr-8">
                  <AlertTitle>Compte temporal</AlertTitle>
                  <AlertDescription>
                    Els comptes temporals no poden modificar el nom, el correu ni la contrasenya.
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Nom</Label>
                  <span className="text-sm">{userData?.displayName || user?.displayName}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Correu</Label>
                  <span className="text-sm">{originalEmail}</span>
                </div>
              </>
            ) : (
              <>
                {showWarning && (
                  <Alert variant="destructive" className="pr-8">
                    <TriangleAlert />
                    <AlertTitle>Contrasenya pendent</AlertTitle>
                    <AlertDescription>
                      Encara no has canviat la teva contrasenya per una de pròpia.{" "}
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => setChangePasswordOpen(true)}
                      >
                        Canvia-la ara
                      </button>
                      .
                    </AlertDescription>
                    <button
                      type="button"
                      onClick={() => setShowWarning(false)}
                      className="absolute right-3 top-3 opacity-70 hover:opacity-100"
                      aria-label="Descartar avís"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Alert>
                )}

                <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="displayName">Nom</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">Correu</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <AnimatePresence initial={false}>
                    {emailChanged && (
                      <motion.div
                        key="currentPasswordForEmail"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="currentPasswordForEmail">Contrasenya actual</Label>
                          <Input
                            id="currentPasswordForEmail"
                            type="password"
                            autoComplete="current-password"
                            placeholder="cal per confirmar el canvi de correu"
                            value={currentPasswordForEmail}
                            onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <Label className="text-xs text-muted-foreground">Contrasenya</Label>
                      <span className="text-sm tracking-widest">{passwordMask}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setChangePasswordOpen(true)}
                    >
                      Canviar
                    </Button>
                  </div>

                  <DialogFooter>
                    <Button type="submit" disabled={isSavingProfile}>
                      {isSavingProfile ? "Guardant..." : "Guardar canvis"}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {!isTemporary && (
        <AdminChangePasswordDialog
          open={changePasswordOpen}
          onOpenChange={setChangePasswordOpen}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
