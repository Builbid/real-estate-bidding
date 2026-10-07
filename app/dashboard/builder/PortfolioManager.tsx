'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, Loader2, MapPin, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  BUILDER_PORTFOLIO_BUCKET,
  BUILDER_PORTFOLIO_MAX_ITEMS,
  BUILDER_PORTFOLIO_MAX_PHOTOS,
  validateBuilderPortfolioImage,
} from '@/lib/builder/portfolioConstants';
import type { BuilderPortfolioItem } from '@/lib/types';

interface PortfolioManagerProps {
  builderId: string;
}

export function PortfolioManager({ builderId }: PortfolioManagerProps) {
  const supabase = createClient();
  const [items, setItems] = useState<BuilderPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('builder_portfolio_items')
      .select('*')
      .eq('builder_id', builderId)
      .order('sort_order', { ascending: true });
    setItems((data ?? []) as BuilderPortfolioItem[]);
    setLoading(false);
  }, [builderId, supabase]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function resetForm() {
    setTitle('');
    setLocation('');
    setDescription('');
    photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPhotoFiles([]);
    setPhotoPreviews([]);
    setError(null);
  }

  function addPhotoFiles(fileList: FileList | null) {
    if (!fileList) return;
    const nextFiles = [...photoFiles];
    const nextPreviews = [...photoPreviews];
    for (const file of Array.from(fileList)) {
      if (nextFiles.length >= BUILDER_PORTFOLIO_MAX_PHOTOS) break;
      const validationError = validateBuilderPortfolioImage(file);
      if (validationError) {
        setError(validationError);
        continue;
      }
      nextFiles.push(file);
      nextPreviews.push(URL.createObjectURL(file));
    }
    setPhotoFiles(nextFiles);
    setPhotoPreviews(nextPreviews);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoFiles((files) => files.filter((_, i) => i !== index));
    setPhotoPreviews((previews) => previews.filter((_, i) => i !== index));
  }

  async function uploadPhotos(itemId: string, files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
      const path = `${builderId}/${itemId}/${Date.now()}_${i}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUILDER_PORTFOLIO_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) continue;
      const { data } = supabase.storage.from(BUILDER_PORTFOLIO_BUCKET).getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !location.trim()) {
      setError('Project title and location are required.');
      return;
    }
    if (items.length >= BUILDER_PORTFOLIO_MAX_ITEMS) {
      setError(`You can showcase up to ${BUILDER_PORTFOLIO_MAX_ITEMS} completed projects.`);
      return;
    }

    setSaving(true);
    const payload = {
      builder_id: builderId,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim(),
      photo_urls: [] as string[],
      sort_order: items.length,
    };

    let inserted = await supabase.from('builder_portfolio_items').insert(payload).select().single();
    if (inserted.error && /location/i.test(inserted.error.message)) {
      inserted = await supabase
        .from('builder_portfolio_items')
        .insert({
          builder_id: payload.builder_id,
          title: payload.title,
          description: [location.trim(), description.trim()].filter(Boolean).join(' — ') || null,
          photo_urls: payload.photo_urls,
          sort_order: payload.sort_order,
        })
        .select()
        .single();
    }

    if (inserted.error || !inserted.data) {
      setError(inserted.error?.message ?? 'Could not save this project.');
      setSaving(false);
      return;
    }

    const row = inserted.data as BuilderPortfolioItem;
    if (photoFiles.length > 0) {
      const urls = await uploadPhotos(row.id, photoFiles);
      if (urls.length > 0) {
        const { data: updated } = await supabase
          .from('builder_portfolio_items')
          .update({ photo_urls: urls })
          .eq('id', row.id)
          .select()
          .single();
        if (updated) {
          setItems((prev) => [...prev, updated as BuilderPortfolioItem]);
        } else {
          setItems((prev) => [...prev, { ...row, photo_urls: urls }]);
        }
      } else {
        setItems((prev) => [...prev, row]);
        setError('Project saved, but the photos could not be uploaded.');
      }
    } else {
      setItems((prev) => [...prev, row]);
    }

    resetForm();
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await supabase.from('builder_portfolio_items').delete().eq('id', id);
    if (!deleteError) setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Completed Projects Portfolio</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Showcase past completed work with site photos, location, and a short description.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (showForm) resetForm();
            setShowForm((open) => !open);
          }}
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? 'Cancel' : 'Add Work'}
        </Button>
      </div>

      {error && <p className="text-xs text-rose-500">{error}</p>}

      {showForm && (
        <form onSubmit={handleAdd} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project title *"
            required
            className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location *"
            required
            className="w-full rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the completed work…"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500/50 focus:outline-none"
          />
          <label className="block text-xs text-muted-foreground">
            Site photos (JPG, PNG, or WebP, up to {BUILDER_PORTFOLIO_MAX_PHOTOS})
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={(e) => addPhotoFiles(e.target.files)}
              className="mt-1 block w-full text-xs text-foreground"
            />
          </label>
          {photoPreviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photoPreviews.map((url, index) => (
                <div key={url} className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button type="submit" size="sm" disabled={saving || !title.trim() || !location.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Completed Project'}
          </Button>
        </form>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading portfolio…
        </p>
      ) : items.length === 0 && !showForm ? (
        <p className="text-xs text-muted-foreground">No completed projects yet. Add your first showcase.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border border-border">
              <div className="flex h-28 items-center justify-center bg-secondary/60">
                {item.photo_urls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.photo_urls[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                  {item.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-rose-400 hover:text-rose-300"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
