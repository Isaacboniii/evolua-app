'use client';
import { useCollection, useFirestore } from '@/firebase';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import { AdminAuthGate } from '@/components/admin-auth-gate';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import { Header } from '@/components/dashboard/header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { EditUserDialog } from '@/components/admin/edit-user-dialog';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, UserPlus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { InviteUserDialog } from '@/components/admin/invite-user-dialog';

export default function AdminPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const usersQuery = useMemo(() => {
        if (!firestore) return null;
        return collection(firestore, 'users');
    }, [firestore]);
    const { data: users, loading } = useCollection<UserProfile>(usersQuery);

    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [userToInviteTo, setUserToInviteTo] = useState<UserProfile | null>(null);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

    const handleEdit = (user: UserProfile) => {
        setEditingUser(user);
        setIsEditDialogOpen(true);
    };
    
    const handleInviteClick = (user: UserProfile) => {
        setUserToInviteTo(user);
        setIsInviteDialogOpen(true);
    };

    const handleDeleteClick = (userId: string) => {
        setDeletingUserId(userId);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (!firestore || !deletingUserId) return;
        
        const docRef = doc(firestore, 'users', deletingUserId);

        deleteDoc(docRef)
            .then(() => {
                toast({
                    title: "Painel Excluído!",
                    description: "O painel foi removido com sucesso.",
                });
            })
            .catch((error) => {
                console.error("Error deleting user document:", error);
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
                toast({
                    variant: "destructive",
                    title: "Erro ao excluir painel",
                    description: "Não foi possível remover o painel. Verifique as permissões.",
                });
            })
            .finally(() => {
                 setIsDeleteDialogOpen(false);
                 setDeletingUserId(null);
            });
    };

    return (
        <AdminAuthGate>
            <div className="flex min-h-screen w-full flex-col bg-background">
                <Header />
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
                <div className="flex items-center">
                    <h1 className="text-lg font-semibold md:text-2xl">Painel do Administrador</h1>
                </div>
                <div
                    className="flex flex-1 items-start justify-center rounded-lg border border-dashed shadow-sm p-4"
                >
                    <div className="w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Paineis</h2>
                            <CreateUserDialog />
                        </div>
                        {loading && (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                             </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users?.map(user => (
                                <div key={user.id} className="relative group">
                                     <Link href={`/admin/dashboard/${user.id}`}>
                                        <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                                            <CardHeader>
                                                <CardTitle>{user.displayName}</CardTitle>
                                                <CardDescription>{user.email}</CardDescription>
                                            </CardHeader>
                                        </Card>
                                    </Link>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => e.preventDefault()}>
                                                    <span className="sr-only">Abrir menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onSelect={() => handleEdit(user)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleInviteClick(user)}>
                                                    <UserPlus className="mr-2 h-4 w-4" />
                                                    Convidar usuário
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onSelect={() => handleDeleteClick(user.id)}
                                                    className="text-destructive focus:text-destructive"
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                </main>
            </div>
            {editingUser && (
                <EditUserDialog 
                    isOpen={isEditDialogOpen} 
                    setIsOpen={setIsEditDialogOpen} 
                    user={editingUser}
                />
            )}
            {userToInviteTo && (
                <InviteUserDialog 
                    isOpen={isInviteDialogOpen} 
                    setIsOpen={setIsInviteDialogOpen} 
                    user={userToInviteTo}
                />
            )}
             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                           Essa ação não pode ser desfeita. Isso excluirá permanentemente o painel e seus dados. A conta de autenticação do usuário não será removida.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingUserId(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AdminAuthGate>
    );
}
