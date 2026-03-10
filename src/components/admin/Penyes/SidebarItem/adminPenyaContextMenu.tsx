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

import { PenyaInfo } from "@/interfaces/interfaces";
import { deletePenya } from "@/services/database/Admin/adminDbServices";
import AdminPenyaSummary from "@/components/admin/Penyes/PenyaSummary/adminPenyaSummary";

interface AdminPenyaContextMenuProps {
  penya: PenyaInfo;
  year: number;
  onDeleted: (penyaId: string) => void;
}

export default function AdminPenyaContextMenu({
  penya,
  year,
  onDeleted,
}: AdminPenyaContextMenuProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePenya(year, penya.id);
      toast.success(`Penya "${penya.name}" eliminada.`);
      onDeleted(penya.id);
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
            <AdminPenyaSummary
              rankingInfo={penya}
              triggerElement={<SidebarMenuButton>{penya.name}</SidebarMenuButton>}
              open={editDialogOpen}
              onOpenChange={setEditDialogOpen}
            />
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar "{penya.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              S'eliminarà la penya permanentment. Aquesta acció és irreversible.
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
