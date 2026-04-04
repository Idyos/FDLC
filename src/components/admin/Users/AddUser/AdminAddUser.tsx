import { motion, AnimatePresence } from "framer-motion";
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
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/Theme/theme-provider";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createUser, updateUser } from "@/services/usersService";
import { getProves } from "@/services/database/Admin/adminDbServices";
import { useYear } from "@/components/shared/Contexts/YearContext";
import {
  User,
  PenyesPermissions,
  ProvesPermissions,
  UsersPermissions,
  penyesPermissions,
  provesPermissions,
  usersPermissions,
} from "@/interfaces/userInterface";
import type { Prova } from "@/interfaces/interfaces";
import { cn } from "@/lib/utils";

const PENYES_LABELS: Record<PenyesPermissions, string> = {
  create: "Crear",
  delete: "Eliminar",
  edit: "Editar",
  "*": "Tot",
};

const PROVES_LABELS: Record<ProvesPermissions, string> = {
  create: "Crear",
  delete: "Eliminar",
  editInfo: "Editar info",
  editResults: "Editar resultats",
  "*": "Tot",
};

const USERS_LABELS: Record<UsersPermissions, string> = {
  create: "Crear",
  delete: "Eliminar",
  "*": "Tot",
};

function togglePermission<T extends string>(
  list: T[],
  setList: (v: T[]) => void,
  value: T,
  wildcard: T
) {
  if (value === wildcard) {
    setList(list.includes(wildcard) ? [] : [wildcard]);
    return;
  }
  const withoutWild = list.filter((v) => v !== wildcard);
  if (withoutWild.includes(value)) {
    setList(withoutWild.filter((v) => v !== value));
  } else {
    setList([...withoutWild, value]);
  }
}

interface PermissionRowProps<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  wildcard: T;
  onChange: (list: T[]) => void;
  onExtra?: (value: T) => void;
}

function PermissionRow<T extends string>({
  label,
  options,
  labels,
  selected,
  wildcard,
  onChange,
  onExtra,
}: PermissionRowProps<T>) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-muted-foreground w-20 shrink-0 pt-1.5 text-right">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((perm) => {
          const isWild = perm === wildcard;
          const isSelected = selected.includes(perm);
          return (
            <Toggle
              key={perm}
              variant="outline"
              size="sm"
              pressed={isSelected}
              onPressedChange={() => {
                togglePermission(selected, onChange, perm, wildcard);
                onExtra?.(perm);
              }}
              className={cn(
                "rounded-full px-3 h-7 text-xs font-medium transition-all",
                isWild && isSelected &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                !isWild && isSelected &&
                  "border-primary/60 bg-primary/10 text-primary dark:bg-primary/20"
              )}
            >
              {isWild ? `★ ${labels[perm]}` : labels[perm]}
            </Toggle>
          );
        })}
      </div>
    </div>
  );
}

interface AdminAddUserProps {
  triggerElement?: ReactNode;
  editMode?: boolean;
  existingUser?: User;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  onUpdated?: (user: User) => void;
}

export default function AdminAddUser({
  triggerElement,
  editMode = false,
  existingUser,
  externalOpen,
  onExternalOpenChange,
  onUpdated,
}: AdminAddUserProps = {}) {
  const { selectedYear } = useYear();
  const { theme } = useTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isDialogOpen = editMode ? (externalOpen ?? false) : internalOpen;
  const setIsDialogOpen = editMode
    ? (onExternalOpenChange ?? (() => {}))
    : setInternalOpen;

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isTemporary, setIsTemporary] = useState(false);

  const [selectedPenyes, setSelectedPenyes] = useState<PenyesPermissions[]>([]);
  const [selectedProves, setSelectedProves] = useState<ProvesPermissions[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UsersPermissions[]>([]);
  const [specificProvaId, setSpecificProvaId] = useState<string>("");

  const [proves, setProves] = useState<Prova[]>([]);

  const showProvaSelector =
    selectedProves.includes("editResults") && !selectedProves.includes("*");

  // Password is only relevant when no email is provided (auto-generated account)
  const needsPassword = !editMode && !email.trim();

  useEffect(() => {
    if (isDialogOpen) {
      if (editMode && existingUser) {
        setDisplayName(existingUser.displayName);
        setEmail(existingUser.email);
        setIsTemporary(existingUser.isTemporary);
        setSelectedPenyes(existingUser.permissions.penyes);
        setSelectedProves(existingUser.permissions.proves);
        setSelectedUsers(existingUser.permissions.users);
        setSpecificProvaId(existingUser.permissions.specificProvaId ?? "");
      }
    } else {
      setDisplayName("");
      setEmail("");
      setPassword("");
      setIsTemporary(false);
      setSelectedPenyes([]);
      setSelectedProves([]);
      setSelectedUsers([]);
      setSpecificProvaId("");
      setProves([]);
    }
  }, [isDialogOpen, editMode, existingUser]);

  useEffect(() => {
    if (showProvaSelector) {
      getProves(selectedYear, setProves);
    } else {
      setSpecificProvaId("");
    }
  }, [showProvaSelector, selectedYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.warning("El nom és obligatori.");
      return;
    }

    if (needsPassword && password.length < 6) {
      toast.warning("La contrasenya ha de tenir almenys 6 caràcters.");
      return;
    }

    const user: User = {
      uid: existingUser?.uid ?? "",
      displayName: displayName.trim(),
      email: email.trim(),
      photoURL: existingUser?.photoURL ?? "",
      isTemporary,
      permissions: {
        penyes: selectedPenyes,
        proves: selectedProves,
        ...(showProvaSelector && specificProvaId ? { specificProvaId } : {}),
        users: selectedUsers,
      },
    };

    setIsLoading(true);
    try {
      if (editMode) {
        await updateUser(user);
        toast.success("Usuari actualitzat correctament!");
        onUpdated?.(user);
        setIsDialogOpen(false);
      } else {
        await createUser(user, password);
        toast.success("Usuari creat correctament!");
        setIsDialogOpen(false);
      }
    } catch (error: any) {
      if (error.code === "auth/email-already-in-use") {
        toast.error("Aquest email ja existeix.");
      } else {
        toast.error(
          editMode
            ? "Error al actualitzar l'usuari: " + (error.message ?? "")
            : "Error al crear l'usuari: " + (error.message ?? "")
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editMode ? "Editar usuari" : "Crear usuari"}</DialogTitle>
        <DialogDescription>
          {editMode
            ? "Modifica les dades i permisos de l'usuari."
            : "Crea un nou usuari d'administració. Si no especifiques un correu, es generarà automàticament i no caldrà contrasenya."}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 py-1">
        {/* Basic info */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName">Nom</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="nom d'usuari"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">
              Email{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (opcional)
              </span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="es genera automàticament si no s'especifica"
              disabled={editMode}
            />
          </div>

          <AnimatePresence initial={false}>
            {needsPassword && (
              <motion.div
                key="password"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Contrasenya</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="mínim 6 caràcters"
                  />
                  <p className="text-xs text-muted-foreground">
                    Necessària per a comptes sense correu real.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <Label htmlFor="isTemporary" className="cursor-pointer">
                Compte temporal
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                S'eliminarà en tancar la prova associada
              </p>
            </div>
            <Switch
              id="isTemporary"
              checked={isTemporary}
              onCheckedChange={setIsTemporary}
            />
          </div>
        </div>

        {/* Permissions section */}
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 px-4 py-4">
          <p className="text-sm font-medium leading-none">Permisos</p>

          <PermissionRow
            label="Penyes"
            options={penyesPermissions}
            labels={PENYES_LABELS}
            selected={selectedPenyes}
            wildcard="*"
            onChange={setSelectedPenyes}
          />

          <div className="flex flex-col gap-2">
            <PermissionRow
              label="Proves"
              options={provesPermissions}
              labels={PROVES_LABELS}
              selected={selectedProves}
              wildcard="*"
              onChange={setSelectedProves}
              onExtra={(perm) => {
                if (perm === "*") setSpecificProvaId("");
              }}
            />

            <AnimatePresence initial={false}>
              {showProvaSelector && (
                <motion.div
                  key="prova-selector"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-[92px] flex flex-col gap-1">
                    <Select value={specificProvaId} onValueChange={setSpecificProvaId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Qualsevol prova (accés global)" />
                      </SelectTrigger>
                      <SelectContent>
                        {proves.map((prova) => (
                          <SelectItem key={prova.id} value={prova.id}>
                            {prova.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Deixa buit per permetre editar totes les proves.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <PermissionRow
            label="Usuaris"
            options={usersPermissions}
            labels={USERS_LABELS}
            selected={selectedUsers}
            wildcard="*"
            onChange={setSelectedUsers}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? editMode ? "Guardant..." : "Creant..."
              : editMode ? "Guardar canvis" : "Crear usuari"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  if (editMode) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  if (triggerElement) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>{triggerElement}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative h-36 rounded-2xl overflow-hidden shadow-lg cursor-pointer"
    >
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild className="w-full h-full">
          <div className="cursor-pointer w-full relative z-10 flex items-center justify-center h-full dark:text-white text-gray-900">
            <div className="dark:bg-neutral-800 bg-gray-200 flex justify-center items-center p-8 rounded-full shadow-lg w-24 h-24">
              <UserPlus size={40} color={theme === "dark" ? "white" : "black"} />
            </div>
          </div>
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    </motion.div>
  );
}
