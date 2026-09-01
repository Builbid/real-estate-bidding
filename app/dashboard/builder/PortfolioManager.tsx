'use client';

import { useState } from 'react';
import { ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BuilderPortfolioItem } from '@/lib/types';

interface PortfolioManagerProps {
  builderId: string;
}

export function PortfolioManager({ builderId }: PortfolioManagerProps) {
  const supabase = createClient();
  const [items, setItems] = useState<BuilderPortfolioItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrls, setPhotoUrls] = useState('');

  async function loadItems() {
    if (loaded) return;
    setLoading(true);
    const { data } = await supabase
      .from('builder_portfolio_items')
      .select('*')
      .eq('builder_id', builderId)
      .order('sort_order', { ascending: true });
    setItems((data ?? []) as BuilderPortfolioItem[]);
    setLoaded(true);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const urls = photoUrls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean);

    const { data, error } = await supabase
      .from('builder_portfolio_items')
      .insert({
        builder_id: builderId,
        title: title.trim(),
        description: description.trim() || null,
        photo_urls: urls,
        sort_order: items.length,
      })
      .select()
      .single();

    if (!error && data) {
      setItems((prev) => [...prev, data as BuilderPortfolioItem]);
      setTitle('');
      setDescription('');
      setPhotoUrls('');
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('builder_portfolio_items').delete().eq('id', id);
    if (!error) setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">My Portfolio</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              loadItems();
              setShowForm((v) => !v);
            }}
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? 'Cancel' : 'Add Work'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Showcase previous projects — visible to clients on your profile.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loaded && !showForm && (
          <Button size="sm" variant="ghost" onClick={loadItems} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load portfolio items'}
          </Button>
        )}

        {showForm && (
          <form onSubmit={handleAdd} className="space-y-3 p-4 rounded-xl bg-secondary/40 border border-border">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title *"
              required
              className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/50"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description of work completed…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/50 resize-none"
            />
            <textarea
              value={photoUrls}
              onChange={(e) => setPhotoUrls(e.target.value)}
              placeholder="Photo URLs (one per line)"
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-secondary/60 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-indigo-500/50 resize-none"
            />
            <Button type="submit" size="sm" disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Portfolio Item'}
            </Button>
          </form>
        )}

        {loaded && items.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground">No portfolio items yet. Add your first project showcase.</p>
        )}

        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card/80 dark:bg-card/60"
              >
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                  {item.photo_urls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.photo_urls[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">{item.photo_urls.length} photo(s)</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-rose-400 hover:text-rose-300 flex-shrink-0"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
