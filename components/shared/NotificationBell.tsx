'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCircle2, Trophy, X } from 'lucide-react'
import { useNotifications, notificationText } from '@/lib/hooks/useNotifications'
import { cn } from '@/lib/utils'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  builder_selected:  <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  you_were_selected: <Trophy       className="w-4 h-4 text-amber-400"   />,
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref             = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    setOpen((v) => !v)
    if (!open && unreadCount > 0) markAllRead()
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3.5 border-b border-border/60 last:border-0 transition-colors',
                    !n.is_read ? 'bg-secondary/40' : 'hover:bg-secondary/20'
                  )}
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center mt-0.5">
                    {TYPE_ICON[n.type] ?? <Bell className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground mb-0.5">{n.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{notificationText(n)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
