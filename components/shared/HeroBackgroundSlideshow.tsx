'use client';

import { useEffect, useState } from 'react';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=1200',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1200',
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1200',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200',
];

const SLIDE_INTERVAL_MS = 4500;

export function HeroBackgroundSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-0 h-full w-full min-h-full" aria-hidden="true">
      {HERO_IMAGES.map((src, index) => (
        <div
          key={src}
          className="absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: 'cover',
            opacity: index === activeIndex ? 1 : 0,
          }}
        />
      ))}
      <div className="absolute inset-0 h-full w-full bg-slate-950/80" />
    </div>
  );
}
