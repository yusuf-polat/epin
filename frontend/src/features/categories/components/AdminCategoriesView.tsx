'use client';

import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { ImageUploadField } from '@/features/uploads/components/ImageUploadField';
import { useCategories, useDeleteCategory, useSaveCategory } from '../hooks/useCategories';
import { CategoryFormInput, categorySchema, CategoryValues } from '../schemas/category.schema';
import { Category } from '../types';

type Notify = (msg: string, ok: boolean) => void;

function CategoryFormModal({ category, nextOrder, onClose, notify }: { category: Category | null; nextOrder: number; onClose: () => void; notify: Notify }) {
  const save = useSaveCategory();
  const { register, handleSubmit, control, formState } = useForm<CategoryFormInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          slug: category.slug,
          description: category.description ?? '',
          icon: category.icon ?? '',
          imageUrl: category.imageUrl,
          sortOrder: category.sortOrder,
          commissionRate: category.commissionRate ?? '',
        }
      : { name: '', slug: '', description: '', icon: '', imageUrl: '', sortOrder: nextOrder, commissionRate: '' },
  });

  const submit = handleSubmit(async (raw) => {
    const v: CategoryValues = categorySchema.parse(raw);
    try {
      await save.mutateAsync({ id: category?.id, input: { ...v, description: v.description || undefined, icon: v.icon || undefined } });
      notify('Kategori kaydedildi.', true);
      onClose();
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  return (
    <Modal open onClose={() => !save.isPending && onClose()} title={category ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <FormField label="Kategori adı" error={formState.errors.name?.message}>
          <input className={inputClass} maxLength={80} {...register('name')} />
        </FormField>
        <FormField label="Slug" error={formState.errors.slug?.message}>
          <input className={inputClass} maxLength={80} placeholder="ör. oyun-ici-bakiye" {...register('slug', { setValueAs: (v: string) => v.toLowerCase() })} />
        </FormField>
        <FormField label="Açıklama" error={formState.errors.description?.message}>
          <textarea rows={2} maxLength={500} className={inputClass} {...register('description')} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Material ikon adı">
            <input className={inputClass} maxLength={60} {...register('icon')} />
          </FormField>
          <FormField label="Sıra" error={formState.errors.sortOrder?.message}>
            <input type="number" min={0} className={inputClass} {...register('sortOrder')} />
          </FormField>
        </div>
        <FormField label="Satış komisyonu (%)" error={formState.errors.commissionRate?.message} hint="Boş bırakılırsa platform varsayılan oranı uygulanır. Yeni oran yalnızca sonraki satışlara uygulanır.">
          <input type="number" step="0.01" min={0} max={50} className={inputClass} {...register('commissionRate')} />
        </FormField>
        <Controller
          control={control}
          name="imageUrl"
          render={({ field, fieldState }) => <ImageUploadField label="Görsel (300x180)" value={field.value} onChange={field.onChange} error={fieldState.error?.message} />}
        />
        <Button type="submit" loading={save.isPending}>
          Kaydet
        </Button>
      </form>
    </Modal>
  );
}

export default function AdminCategoriesView() {
  const categories = useCategories();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const { toast, show } = useToast();
  const notify: Notify = (msg, ok) => show(msg, ok ? 'success' : 'error');

  const onDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      notify('Kategori silindi.', true);
      setDeleting(null);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Kategori Yönetimi</h1>
          <p className="text-xs text-[#64748b] mt-1">Ürün içeren kategoriler silinemez; önce ürünleri taşıyınız.</p>
        </div>
        <Button onClick={() => setEditing('new')}>+ Yeni Kategori</Button>
      </div>

      {categories.isPending ? (
        <LoadingState />
      ) : categories.isError ? (
        <ErrorState message={getErrorMessage(categories.error)} onRetry={() => categories.refetch()} />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1f2b] text-[#64748b]">
                <th className="text-left px-4 py-3">Görsel</th>
                <th className="text-left px-4 py-3">Ad</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-center px-4 py-3">Sıra</th>
                <th className="text-center px-4 py-3">Komisyon</th>
                <th className="text-center px-4 py-3">Yayında Ürün</th>
                <th className="text-right px-4 py-3">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c1f2b]">
              {categories.data.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <img src={c.imageUrl} alt="" className="w-20 h-12 object-contain rounded-lg border border-[#1c1f2b] bg-[#090a0f]" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-white">{c.name}</div>
                    {c.description && <div className="text-[11px] text-[#64748b] truncate max-w-[260px]">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3 font-mono text-[#38bdf8]">{c.slug}</td>
                  <td className="px-4 py-3 text-center text-[#94a3b8]">{c.sortOrder}</td>
                  <td className="px-4 py-3 text-center text-[#94a3b8]">{c.commissionRate == null ? 'Varsayılan' : `%${c.commissionRate}`}</td>
                  <td className="px-4 py-3 text-center text-white">{c._count?.products ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditing(c)} className="px-2.5 py-1 rounded-lg bg-[#161824] border border-[#222534] text-[#38bdf8] font-bold">
                        Düzenle
                      </button>
                      <button type="button" onClick={() => setDeleting(c)} className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <CategoryFormModal
          category={editing === 'new' ? null : editing}
          nextOrder={(categories.data?.length ?? 0) + 1}
          onClose={() => setEditing(null)}
          notify={notify}
        />
      )}
      <Modal open={!!deleting} onClose={() => !remove.isPending && setDeleting(null)} title="Kategoriyi Sil">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#94a3b8]">&quot;{deleting?.name}&quot; kategorisi silinecek.</p>
          <Button variant="danger" loading={remove.isPending} onClick={onDelete}>
            Sil
          </Button>
        </div>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
