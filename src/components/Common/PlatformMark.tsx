import React from 'react';
import { PlatformId } from '../../types';

export const PLATFORM_META: Record<PlatformId, { name: string; shortName: string; host: string; url: string; letter: string; tint: string }> = {
  chatgpt: {
    name: 'ChatGPT',
    shortName: 'ChatGPT',
    host: 'chatgpt.com',
    url: 'https://chatgpt.com',
    letter: 'C',
    tint: 'bg-[#10a37f] text-white',
  },
  gemini: {
    name: 'Google Gemini',
    shortName: 'Gemini',
    host: 'gemini.google.com',
    url: 'https://gemini.google.com',
    letter: 'G',
    tint: 'bg-[#4b7bec] text-white',
  },
  claude: {
    name: 'Anthropic Claude',
    shortName: 'Claude',
    host: 'claude.ai',
    url: 'https://claude.ai',
    letter: 'A',
    tint: 'bg-[#d97757] text-white',
  },
};

interface PlatformMarkProps {
  platform: PlatformId;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'size-6 text-xs rounded-md',
  md: 'size-9 text-sm rounded-lg',
  lg: 'size-11 text-base rounded-xl',
};

export const PlatformMark: React.FC<PlatformMarkProps> = ({ platform, size = 'md' }) => {
  const meta = PLATFORM_META[platform];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center font-semibold ${meta.tint} ${sizeStyles[size]}`}
    >
      {meta.letter}
    </span>
  );
};

export { platformFromUrl as detectPlatformFromUrl } from '../../adapters/platform-urls';
