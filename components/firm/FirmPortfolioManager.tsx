'use client';

import { useCallback, useEffect, useState } from 'react';
import { ImageIcon, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  createFirmPortfolioItemAction,
  deleteFirmPortfolioItemAction,
  getFirmPortfolioAction,
} from '@/app/actions/firm';
import {
  FIRM_PORTFOLIO_BUCKET,
  FIRM_PORTFOLIO_MAX_ITEMS,
  FIRM_PORTFOLIO_MAX_PHOTOS,
  validateFirmImageFile,
  FIRM_PORTFOLIO_PHOTO_MAX_BYTES,
} from '@/lib/firm/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { FirmPortfolioItem } from '@/lib/types';
import { cn } from '@/lib/utils';

export function FirmPortfolioManager() {
  const [items, setItems] = useState<FirmPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState('');
  const [location, setLocation] = useState('');
  const [yearCompleted, setYearCompleted] = useState('');
  const [description, setDescription] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    const result = await getFirmPortfolioAction();
    if (!result.error) setItems(result.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function resetForm() {
    setProjectName('');
    setLocation('');
    setYearCompleted('');
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
      if (next.length >= FIRM_PORTFOLIO_MAX_PHOTOS) break;
      const err = validateFirmImageFile(file, FIRM_PORTFOLIO_PHOTO_MAX_BYTES);
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

  async function uploadPhotos(portfolioId: string, files: File[]): Promise<string[]> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
      const path = `${user.id}/${portfolioId}/${Date.now()}_${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(FIRM_PORTFOLIO_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) continue;
      const { data: { publicUrl } } = supabase.storage.from(FIRM_PORTFOLIO_BUCKET).getPublicUrl(path);
      urls.push(publicUrl);
    }

    if (urls.length > 0) {
      await supabase.from('firm_portfolio').update({ photos: urls }).eq('id', portfolioId);
    }
    return urls;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const year = parseInt(yearCompleted, 10);
    if (!projectName.trim() || !location.trim() || !yearCompleted) {
      setError('Project name, location, and year are required.');
      return;
    }
    if (Number.isNaN(year) || year < 1950 || year > new Date().getFullYear()) {
      setError('Enter a valid completion year.');
      return;
    }
    if (description.length > 300) {
      setError('Description must be 300 characters or less.');
      return;
    }

    setSaving(true);

    const result = await createFirmPortfolioItemAction({
      project_name: projectName,
      location,
      year_completed: year,
      photos: [],
      description: description || undefined,
    });

    if (result.error || !result.id) {
      setError(result.error ?? 'Could not save project.');
      setSaving(false);
      return;
    }

    if (photoFiles.length > 0) {
      await uploadPhotos(result.id, photoFiles);
    }

    await loadItems();
    resetForm();
    setModalOpen(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const result = await deleteFirmPortfolioItemAction(id);
    if (!result.error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Portfolio</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {items.length} / {FIRM_PORTFOLIO_MAX_ITEMS} projects added
            </p>
          </div>
          <Button
            size="sm"
            disabled={items.length >= FIRM_PORTFOLIO_MAX_ITEMS}
            onClick={() => { resetForm(); setModalOpen(true); }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add New Project
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
            No portfolio projects yet. Add your past work to build owner trust.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-secondary/30 overflow-hidden"
              >
                <div className="aspect-video bg-secondary/60 flex items-center justify-center">
                  {item.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photos[0]} alt={item.project_name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground">{item.project_name}</p>
                  <p className="text-xs text-muted-foreground">{item.location} · {item.year_completed}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="ghost" className="text-red-400 h-7 px-2" onClick={() => void handleDelete(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-foreground">Add Portfolio Project</h3>
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {error && <p className="text-xs text-red-400">{error}</p>}

                <Input label="Project Name *" value={projectName} onChange={(e) => setProjectName(e.target.value)} required />
                <Input label="Location / City *" value={location} onChange={(e) => setLocation(e.target.value)} required />
                <Input
                  label="Year Completed *"
                  type="number"
                  min={1950}
                  max={new Date().getFullYear()}
                  value={yearCompleted}
                  onChange={(e) => setYearCompleted(e.target.value)}
                  required
                />

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Photos (up to {FIRM_PORTFOLIO_MAX_PHOTOS})</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); addPhotoFiles(e.dataTransfer.files); }}
                    className={cn(
                      'mt-1.5 rounded-xl border-2 border-dashed p-4 transition-colors',
                      dragOver ? 'border-violet-400 bg-violet-500/5' : 'border-border',
                    )}
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {photoPreviews.map((src, i) => (
                        <div key={src} className="relative aspect-square rounded-lg overflow-hidden bg-secondary">
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
                      {photoFiles.length < FIRM_PORTFOLIO_MAX_PHOTOS && (
                        <label className="aspect-square rounded-lg border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-secondary/50">
                          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-[10px] text-muted-foreground">Add</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
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
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 300))}
                    rows={3}
                    placeholder="Brief project summary…"
                    className="mt-1.5 w-full rounded-lg border border-border bg-card/80 px-3 py-2 text-sm resize-none"
                  />
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">{description.length}/300</p>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Project'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
