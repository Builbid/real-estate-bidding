import Image from 'next/image';
import type { ServiceType } from '@/lib/types';

const PHOTO_SIZE = 80;

type CategoryPhoto = {
  src: string;
  alt: string;
  objectPosition: string;
};

const CATEGORY_PHOTOS: Record<ServiceType, CategoryPhoto> = {
  labour_contractor: {
    src: '/mistri-worker.jpg',
    alt: 'Mistri Worker',
    objectPosition: '28% 40%',
  },
  drawing_design: {
    src: '/Drawing and Design.jpg',
    alt: 'Drawing and Design',
    objectPosition: '70% 42%',
  },
  painter: {
    src: '/Painter.jpg',
    alt: 'Painter',
    objectPosition: '72% 35%',
  },
  plumber: {
    src: '/Plumber.jpg',
    alt: 'Plumber',
    objectPosition: '78% 42%',
  },
  electrician: {
    src: '/Electrician.jpg',
    alt: 'Electrician',
    objectPosition: '32% 40%',
  },
  earthwork: {
    src: '/Earthwork.jpg',
    alt: 'Earthwork',
    objectPosition: '45% 70%',
  },
  construction_firm: {
    src: '/Earthwork.jpg',
    alt: 'Construction Firm',
    objectPosition: '45% 70%',
  },
  carpenter: {
    src: '/mistri-worker.jpg',
    alt: 'Carpenter',
    objectPosition: '28% 40%',
  },
  false_ceiling_work: {
    src: '/Painter.jpg',
    alt: 'False Ceiling Work',
    objectPosition: '72% 35%',
  },
};

export function CategoryServiceIcon({ service }: { service: ServiceType }) {
  const photo = CATEGORY_PHOTOS[service] ?? CATEGORY_PHOTOS.labour_contractor;

  return (
    <span className="relative block h-20 w-20 overflow-hidden rounded-xl">
      <Image
        src={photo.src}
        alt={photo.alt}
        width={PHOTO_SIZE}
        height={PHOTO_SIZE}
        sizes="80px"
        priority
        className="h-20 w-20 rounded-xl object-cover"
        style={{ objectPosition: photo.objectPosition }}
      />
    </span>
  );
}
