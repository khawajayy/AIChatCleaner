import React from 'react';
import { BrushCleaning } from 'lucide-react';

interface BrandLogoProps {
  size?: 'sm' | 'md';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md' }) => {
  const box = size === 'sm' ? 'size-8 rounded-lg' : 'size-10 rounded-xl';
  const icon = size === 'sm' ? 'size-[18px]' : 'size-[22px]';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center bg-accent text-accent-fg ${box}`} aria-hidden="true">
      <BrushCleaning className={icon} strokeWidth={2.25} />
    </span>
  );
};
