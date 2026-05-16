import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

import { Prova } from "@/interfaces/interfaces";
import { navigateWithQuery } from "@/utils/url";
import { deleteProva } from "@/services/database/Admin/adminDbServices";

interface AdminProvaContextMenuProps {
  prova: Prova;
  year: number;
  canNavigate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onDeleted: (provaId: string) => void;
}

export default function AdminProvaContextMenu({
  prova,
  year,
  canNavigate = true,
  canEdit = true,
  canDelete = true,
  onDeleted,
}: AdminProvaContextMenuProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigateToProva = () => {
    navigateWithQuery(navigate, "/admin/prova", { provaId: prova.id });
  };

  const navigateToEditProva = () => {
    navigateWithQuery(navigate, "/admin/editProva", { provaId: prova.id });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProva(year, prova.id);
      toast.success(`Prova "${prova.name}" eliminada.`);
      onDeleted(prova.id);
    } catch {
      // toast already shown by service
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
            <SidebarMenuButton onClick={canNavigate ? navigateToProva : undefined}>
              {prova.isSecret ? "Secreta" : prova.name}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </ContextMenuTrigger>
        {(canEdit || canDelete) && (
          <ContextMenuContent>
            {canEdit && (
              <ContextMenuItem onClick={navigateToEditProva}>
                <Pencil />
                Editar
              </ContextMenuItem>
            )}
            {canEdit && canDelete && <ContextMenuSeparator />}
            {canDelete && (
              <ContextMenuItem
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 />
                Eliminar
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        )}
      </ContextMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminar "{prova.isSecret ? "Secreta" : prova.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              S'eliminaran tots els participants i resultats d'aquesta prova.
              Aquesta acció és irreversible.
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
