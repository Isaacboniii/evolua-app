'use client';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Category } from '@/lib/types';
import { iconList, getIcon } from '@/lib/icon-map';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Trash2, Edit } from 'lucide-react';

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'O nome é obrigatório.'),
  icon: z.string().min(1, 'O ícone é obrigatório.'),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function ManageCategoriesDialog({ isOpen, setIsOpen }: ManageCategoriesDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const categoriesQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'categories');
  }, [firestore]);
  const { data: categories, loading } = useCollection<Category>(categoriesQuery);

  const { control, handleSubmit, register, reset } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', icon: '' },
  });

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    reset(category);
  };
  
  const handleCancelEdit = () => {
    setEditingCategory(null);
    reset({ name: '', icon: '' });
  };

  const onSubmit = (data: CategoryFormData) => {
    if (!firestore) return;

    const { id, ...categoryData } = data;

    if (editingCategory) {
      const docRef = doc(firestore, 'categories', editingCategory.id);
      setDoc(docRef, categoryData, { merge: true })
        .then(() => {
          toast({ title: 'Categoria Atualizada!', description: `A categoria ${data.name} foi atualizada.` });
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'update',
            requestResourceData: categoryData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    } else {
      const collectionRef = collection(firestore, 'categories');
      addDoc(collectionRef, categoryData)
        .then(() => {
          toast({ title: 'Categoria Adicionada!', description: `A categoria ${data.name} foi adicionada.` });
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: collectionRef.path,
            operation: 'create',
            requestResourceData: categoryData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }

    handleCancelEdit();
  };

  const handleDelete = (categoryId: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'categories', categoryId);
    deleteDoc(docRef)
      .then(() => {
        toast({ title: 'Categoria Removida' });
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
          <DialogDescription>Adicione, edite ou remova as categorias de transação.</DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
            <div>
                <h3 className="font-semibold mb-4">{editingCategory ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</h3>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Categoria</Label>
                        <Input id="name" {...register('name')} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="icon">Ícone</Label>
                         <Controller
                            name="icon"
                            control={control}
                            render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um ícone" />
                                </SelectTrigger>
                                <SelectContent>
                                    <ScrollArea className="h-48">
                                    {iconList.map(iconName => {
                                        const Icon = getIcon(iconName);
                                        return (
                                            <SelectItem key={iconName} value={iconName}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="h-4 w-4" />
                                                    <span>{iconName}</span>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                            )}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit">{editingCategory ? 'Salvar Alterações' : 'Adicionar'}</Button>
                        {editingCategory && <Button type="button" variant="ghost" onClick={handleCancelEdit}>Cancelar</Button>}
                    </div>
                </form>
            </div>
            <div>
                <h3 className="font-semibold mb-4">Categorias Existentes</h3>
                 <ScrollArea className="h-64 pr-4">
                    <div className="space-y-2">
                    {loading && <p>Carregando...</p>}
                    {categories?.map(cat => {
                        const Icon = getIcon(cat.icon);
                        return (
                        <div key={cat.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                            <div className="flex items-center gap-2">
                                <Icon className="h-5 w-5 text-muted-foreground" />
                                <span>{cat.name}</span>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(cat)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        )
                    })}
                    </div>
                </ScrollArea>
            </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Fechar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
