'use client';

import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { AdminResourceCategory } from '@heartlink/api-contract';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { createResourceCategory, updateResourceCategory } from '../../lib/actions';
import { CheckboxField } from '../ui/checkbox';

interface Props {
  mode: 'create' | 'edit';
  category?: AdminResourceCategory;
  trigger: React.ReactNode;
}

interface FormState {
  slug: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  slug: '',
  title: '',
  description: '',
  icon: '',
  sortOrder: '0',
  isActive: true,
};

function fromCategory(category: AdminResourceCategory): FormState {
  return {
    slug: category.slug,
    title: category.title,
    description: category.description ?? '',
    icon: category.icon ?? '',
    sortOrder: String(category.sortOrder),
    isActive: category.isActive,
  };
}

export function ResourceCategoryFormDialog({ mode, category, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState>(category ? fromCategory(category) : EMPTY);

  useEffect(() => {
    if (open) setForm(category ? fromCategory(category) : EMPTY);
  }, [open, category]);

  const onSubmit = () => {
    if (form.slug.trim().length === 0) {
      toast.error('Slug is required');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug.trim())) {
      toast.error('Slug must use lowercase letters, numbers, and hyphens');
      return;
    }
    if (form.title.trim().length === 0) {
      toast.error('Title is required');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          slug: form.slug.trim().toLowerCase(),
          title: form.title.trim(),
          description: form.description.trim() || null,
          icon: form.icon.trim() || null,
          sortOrder: Number.parseInt(form.sortOrder || '0', 10) || 0,
          isActive: form.isActive,
        };

        if (mode === 'create') {
          await createResourceCategory(payload);
          toast.success(`Created category "${payload.title}"`);
        } else if (category) {
          await updateResourceCategory({ id: category.id, ...payload });
          toast.success(`Updated category "${payload.title}"`);
        }
        setOpen(false);
      } catch (err) {
        toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Add Category' : 'Edit Category'}</DialogTitle>
            <DialogDescription>
              Keep the public resources directory structured around real support themes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-category-title">Title</Label>
              <Input
                id="resource-category-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-category-slug">Slug</Label>
              <Input
                id="resource-category-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm({
                    ...form,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  })
                }
                disabled={isPending}
                placeholder="housing-support"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-category-icon">Icon label (optional)</Label>
              <Input
                id="resource-category-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                disabled={isPending}
                placeholder="house"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-category-order">Sort order</Label>
              <Input
                id="resource-category-order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="resource-category-description">Description</Label>
              <Textarea
                id="resource-category-description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={isPending}
              />
            </div>
            <CheckboxField
              className="col-span-2"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              disabled={isPending}
              label="Category is active in the public directory"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onSubmit} disabled={isPending}>
              {isPending
                ? mode === 'create'
                  ? 'Adding…'
                  : 'Saving…'
                : mode === 'create'
                  ? 'Add category'
                  : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
