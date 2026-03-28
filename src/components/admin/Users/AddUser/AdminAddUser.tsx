import { motion } from "framer-motion";
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
import { Checkbox } from "@/components/ui/checkbox";
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

const PENYES_LABELS: Record<PenyesPermissions, string> = {
  create: "Crear",
  delete: "Eliminar",
  edit: "Editar",
  "*": "Tot (*)",
};

const PROVES_LABELS: Record<ProvesPermissions, string> = {
  create: "Crear",
  delete: "Eliminar",
  editInfo: "Editar info",
  editResults: "Editar resultats",
  "*": "Tot (*)",
};

const USERS_LABELS: Record<UsersPermissions, string> = {
  create: "Crear",
  delete: "Eliminar",
  "*": "Tot (*)",
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

  // Populate fields when dialog opens
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

    if (!editMode && password.length < 6) {
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
    <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editMode ? "Editar usuari" : "Crear usuari"}</DialogTitle>
        <DialogDescription>
          {editMode
            ? "Modifica les dades i permisos de l'usuari."
            : "Crea un nou usuari d'administració. El correu es genera automàticament si no n'especifiques un."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4 py-2">
        {/* Nom */}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="displayName" className="text-right">Nom</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="col-span-3"
            placeholder="nom d'usuari"
          />
        </div>

        {/* Email — read-only in edit mode */}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="email" className="text-right">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="col-span-3"
            placeholder="opcional — es genera automàticament"
            disabled={editMode}
          />
        </div>

        {/* Contrasenya — hidden in edit mode */}
        {!editMode && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">Contrasenya</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="col-span-3"
              placeholder="mínim 6 caràcters"
            />
          </div>
        )}

        {/* Temporal */}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">Temporal</Label>
          <div className="col-span-3 flex items-center gap-2">
            <Checkbox
              id="isTemporary"
              checked={isTemporary}
              onCheckedChange={(v) => setIsTemporary(!!v)}
            />
            <Label htmlFor="isTemporary" className="font-normal cursor-pointer">
              S'eliminarà en tancar la prova associada
            </Label>
          </div>
        </div>

        {/* Permisos Penyes */}
        <div className="grid grid-cols-4 gap-2">
          <Label className="text-right pt-1">Penyes</Label>
          <div className="col-span-3 flex flex-wrap gap-x-4 gap-y-2">
            {penyesPermissions.map((perm) => (
              <div key={perm} className="flex items-center gap-1.5">
                <Checkbox
                  id={`penyes-${perm}`}
                  checked={selectedPenyes.includes(perm)}
                  onCheckedChange={() =>
                    togglePermission(selectedPenyes, setSelectedPenyes, perm, "*")
                  }
                />
                <Label htmlFor={`penyes-${perm}`} className="font-normal cursor-pointer">
                  {PENYES_LABELS[perm]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Permisos Proves */}
        <div className="grid grid-cols-4 gap-2">
          <Label className="text-right pt-1">Proves</Label>
          <div className="col-span-3 flex flex-wrap gap-x-4 gap-y-2">
            {provesPermissions.map((perm) => (
              <div key={perm} className="flex items-center gap-1.5">
                <Checkbox
                  id={`proves-${perm}`}
                  checked={selectedProves.includes(perm)}
                  onCheckedChange={() => {
                    togglePermission(selectedProves, setSelectedProves, perm, "*");
                    if (perm === "*") setSpecificProvaId("");
                  }}
                />
                <Label htmlFor={`proves-${perm}`} className="font-normal cursor-pointer">
                  {PROVES_LABELS[perm]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Selector prova específica */}
        {showProvaSelector && (
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2 text-sm text-muted-foreground">
              Prova específica
            </Label>
            <div className="col-span-3">
              <Select value={specificProvaId} onValueChange={setSpecificProvaId}>
                <SelectTrigger>
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
              <p className="text-xs text-muted-foreground mt-1">
                Si selecciones una prova, l'usuari només podrà editar resultats d'aquella prova.
              </p>
            </div>
          </div>
        )}

        {/* Permisos Usuaris */}
        <div className="grid grid-cols-4 gap-2">
          <Label className="text-right pt-1">Usuaris</Label>
          <div className="col-span-3 flex flex-wrap gap-x-4 gap-y-2">
            {usersPermissions.map((perm) => (
              <div key={perm} className="flex items-center gap-1.5">
                <Checkbox
                  id={`users-${perm}`}
                  checked={selectedUsers.includes(perm)}
                  onCheckedChange={() =>
                    togglePermission(selectedUsers, setSelectedUsers, perm, "*")
                  }
                />
                <Label htmlFor={`users-${perm}`} className="font-normal cursor-pointer">
                  {USERS_LABELS[perm]}
                </Label>
              </div>
            ))}
          </div>
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

  // Edit mode: controlled externally, no trigger element
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
