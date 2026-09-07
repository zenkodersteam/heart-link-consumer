'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { AdminResource, AdminResourceCategory } from '@heartlink/api-contract';
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
import { createResource, updateResource } from '../../lib/actions';
import { Select } from '../ui/select';
import { CheckboxField } from '../ui/checkbox';

interface Props {
  mode: 'create' | 'edit';
  resource?: AdminResource;
  categories: AdminResourceCategory[];
  trigger: React.ReactNode;
}

interface FormState {
  categoryId: string;
  title: string;
  organization: string;
  description: string;
  url: string;
  phone: string;
  tags: string;
  sortOrder: string;
  isPublished: boolean;
}

const EMPTY: FormState = {
  categoryId: '',
  title: '',
  organization: '',
  description: '',
  url: '',
  phone: '',
  tags: '',
  sortOrder: '0',
  isPublished: true,
};

function fromResource(resource: AdminResource): FormState {
  return {
    categoryId: resource.categoryId,
    title: resource.title,
    organization: resource.organization ?? '',
    description: resource.description ?? '',
    url: resource.url ?? '',
    phone: resource.phone ?? '',
    tags: resource.tags.join(', '),
    sortOrder: String(resource.sortOrder),
    isPublished: resource.isPublished,
  };
}

export function ResourceFormDialog({ mode, resource, categories, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const defaultCategoryId = useMemo(() => categories[0]?.id ?? '', [categories]);
  const [form, setForm] = useState<FormState>(resource ? fromResource(resource) : { ...EMPTY, categoryId: defaultCategoryId });

  useEffect(() => {
    if (open) {
      setForm(resource ? fromResource(resource) : { ...EMPTY, categoryId: defaultCategoryId });
    }
  }, [open, resource, defaultCategoryId]);

  const onSubmit = () => {
    if (!form.categoryId) {
      toast.error('Category is required');
      return;
    }
    if (form.title.trim().length === 0) {
      toast.error('Title is required');
      return;
    }

    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        const payload = {
          categoryId: form.categoryId,
          title: form.title.trim(),
          organization: form.organization.trim() || null,
          description: form.description.trim() || null,
          url: form.url.trim() || null,
          phone: form.phone.trim() || null,
          tags,
          sortOrder: Number.parseInt(form.sortOrder || '0', 10) || 0,
          isPublished: form.isPublished,
        };

        if (mode === 'create') {
          await createResource(payload);
          toast.success(`Created resource "${payload.title}"`);
        } else if (resource) {
          await updateResource({ id: resource.id, ...payload });
          toast.success(`Updated resource "${payload.title}"`);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{mode === 'create' ? 'Add Resource' : 'Edit Resource'}</DialogTitle>
            <DialogDescription>
              Publish vetted support links people can actually use during slow communication cycles.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-category">Category</Label>
              <Select
                id="resource-category"
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
                disabled={isPending || categories.length === 0}
                placeholder={categories.length === 0 ? 'No categories yet' : 'Select a category'}
                options={categories.map((c) => ({ value: c.id, label: c.title }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-order">Sort order</Label>
              <Input
                id="resource-order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="resource-title">Title</Label>
              <Input
                id="resource-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="resource-organization">Organization</Label>
              <Input
                id="resource-organization"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="resource-description">Description</Label>
              <Textarea
                id="resource-description"
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-url">URL</Label>
              <Input
                id="resource-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                disabled={isPending}
                placeholder="https://example.org/help"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resource-phone">Phone</Label>
              <Input
                id="resource-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={isPending}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="resource-tags">Tags (comma separated)</Label>
              <Input
                id="resource-tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                disabled={isPending}
                placeholder="housing, legal, reentry"
              />
            </div>
            <CheckboxField
              className="col-span-2"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              disabled={isPending}
              label="Publish this resource to the consumer directory"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onSubmit} disabled={isPending || categories.length === 0}>
              {isPending
                ? mode === 'create'
                  ? 'Adding…'
                  : 'Saving…'
                : mode === 'create'
                  ? 'Add resource'
                  : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
