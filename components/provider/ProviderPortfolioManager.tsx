'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  BUILDER_PORTFOLIO_BUCKET,
  BUILDER_PORTFOLIO_IMAGE_ACCEPT,
  BUILDER_PORTFOLIO_MAX_ITEMS,
  BUILDER_PORTFOLIO_MAX_PHOTOS,
  validateBuilderPortfolioImage,
} from '@/lib/builder/portfolioConstants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { BuilderPortfolioItem } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProviderPortfolioManagerProps {
  builderId: string;
  /** Short hint under the title (e.g. Drawing and Design). */
  specialtyLabel?: string;
}

export function ProviderPortfolioManager({
  builderId,
  specialtyLabel = 'your work',
}: ProviderPortfolioManagerProps) {
  const [items, setItems] = useState<BuilderPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('builder_portfolio_items')
      .select('*')
      .eq('builder_id', builderId)
      .order('sort_order', { ascending: true });
    setItems((data ?? []) as BuilderPortfolioItem[]);
    setLoading(false);
  }, [builderId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function resetForm() {
    setTitle('');
    setDescription('');
    photoPreviews.forEach((u) => URL.revokeObjectURL(u));
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setError(null);
  }

  function addPhotoFiles(fileList: FileList | null) {
    if (!fileList) return;
    const next: File[] = [...photoFiles];
    const nextPreviews: string[] = [...photoPreviews];

    for (const file of Array.from(fileList)) {
      if (next.length >= BUILDER_PORTFOLIO_MAX_PHOTOS) break;
      const err = validateBuilderPortfolioImage(file);
      if (err) {
        setError(err);
        continue;
      }
      next.push(file);
      nextPreviews.push(URL.createObjectURL(file));
    }
    setPhotoFiles(next);
    setPhotoPreviews(nextPreviews);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles((f) => f.filter((_, i) => i !== index));
    setPhotoPreviews((p) => p.filter((_, i) => i !== index));
  }

  async function uploadPhotos(itemId: string, files: File[]): Promise<string[]> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
      const path = `${user.id}/${itemId}/${Date.now()}_${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUILDER_PORTFOLIO_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) continue;
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUILDER_PORTFOLIO_BUCKET).getPublicUrl(path);
      urls.push(publicUrl);
    }

    if (urls.length > 0) {
      await supabase
        .from('builder_portfolio_items')
        .update({ photo_urls: urls })
        .eq('id', itemId);
    }
    return urls;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Project / work title is required.');
      return;
    }
    if (photoFiles.length === 0) {
      setError('Add at least one photo of your work.');
      return;
    }
    if (description.length > 400) {
      setError('Description must be 400 characters or less.');
      return;
    }
    if (items.length >= BUILDER_PORTFOLIO_MAX_ITEMS) {
      setError(`Maximum ${BUILDER_PORTFOLIO_MAX_ITEMS} portfolio items.`);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    const { data, error: insertErr } = await supabase
      .from('builder_portfolio_items')
      .insert({
        builder_id: builderId,
        title: title.trim(),
        description: description.trim() || null,
        photo_urls: [],
        sort_order: items.length,
      })
      .select()
      .single();

    if (insertErr || !data) {
      setError(insertErr?.message ?? 'Could not save portfolio item. Apply migration 028 if needed.');
      setSaving(false);
      return;
    }

    await uploadPhotos(data.id, photoFiles);
    await loadItems();
    resetForm();
    setModalOpen(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error: delErr } = await supabase.from('builder_portfolio_items').delete().eq('id', id);
    if (!delErr) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Portfolio</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Upload samples of {specialtyLabel} — clients see these before selecting you in a bid.
              {' '}({items.length}/{BUILDER_PORTFOLIO_MAX_ITEMS})
            </p>
          </div>
          <Button
            size="sm"
            disabled={items.length >= BUILDER_PORTFOLIO_MAX_ITEMS}
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add work
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No portfolio yet. Add photos of plans, elevations, or past design work so clients can review
            your skills.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-secondary/30 overflow-hidden"
              >
                <div className="aspect-video bg-secondary/60 flex items-center justify-center">
                  {item.photo_urls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.photo_urls[0]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {item.photo_urls?.length ?? 0} photo{(item.photo_urls?.length ?? 0) === 1 ? '' : 's'}
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 h-7 px-2 mt-2"
                    onClick={() => void handleDelete(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-foreground">Add portfolio work</h3>
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {error && <p className="text-xs text-red-400">{error}</p>}

                <Input
                  label="Title *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 3BHK house plan — Nagaon"
                  required
                />

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Photos * (up to {BUILDER_PORTFOLIO_MAX_PHOTOS})
                  </label>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      addPhotoFiles(e.dataTransfer.files);
                    }}
                    className={cn(
                      'mt-1.5 rounded-xl border-2 border-dashed p-4 transition-colors',
                      dragOver ? 'border-emerald-400 bg-emerald-500/5' : 'border-border',
                    )}
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {photoPreviews.map((src, i) => (
                        <div
                          key={src}
                          className="relative aspect-square rounded-lg overflow-hidden bg-secondary"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {photoFiles.length < BUILDER_PORTFOLIO_MAX_PHOTOS && (
                        <label className="aspect-square rounded-lg border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50">
                          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">Add</span>
                          <input
                            type="file"
                            accept={BUILDER_PORTFOLIO_IMAGE_ACCEPT}
                            multiple
                            className="hidden"
                            onChange={(e) => addPhotoFiles(e.target.files)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 400))}
                    rows={3}
                    placeholder="Brief note about this work sample…"
                    className="mt-1.5 w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                    {description.length}/400
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save to portfolio'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
