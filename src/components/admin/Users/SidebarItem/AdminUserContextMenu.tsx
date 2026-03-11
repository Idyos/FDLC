import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";

import { User } from "@/interfaces/userInterface";
import { deleteUser } from "@/services/usersService";
import AdminAddUser from "../AddUser/AdminAddUser";

interface AdminUserContextMenuProps {
  user: User;
  onDeleted: (uid: string) => void;
  onUpdated: (user: User) => void;
}

export default function AdminUserContextMenu({
  user,
  onDeleted,
  onUpdated,
}: AdminUserContextMenuProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteUser(user.uid);
      toast.success(`Usuari "${user.displayName || user.email}" eliminat.`);
      onDeleted(user.uid);
    } catch {
      toast.error("Error al eliminar l'usuari.");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setEditDialogOpen(true)}>
              {user.displayName || user.email}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setEditDialogOpen(true)}>
            <Pencil />
            Editar
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 />
            Eliminar
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AdminAddUser
        editMode
        existingUser={user}
        externalOpen={editDialogOpen}
        onExternalOpenChange={setEditDialogOpen}
        onUpdated={onUpdated}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminar "{user.displayName || user.email}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              S'eliminarà l'usuari del sistema. Aquesta acció és irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleDelete}
              className={buttonVariants({ variant: "destructive" })}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
