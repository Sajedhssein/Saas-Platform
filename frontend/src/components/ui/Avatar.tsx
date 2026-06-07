import { useState } from 'react';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  imageUrl?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

const getInitial = (name?: string | null): string => {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return 'U';
  }

  return trimmedName.charAt(0).toUpperCase();
};

export const Avatar = ({ imageUrl, name, size = 'md', className = '' }: AvatarProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(imageUrl && !imageFailed);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-slate-800 to-blue-700 font-semibold leading-none text-white ring-1 ring-white/40 shadow-sm ${sizeClasses[size]} ${className}`}
      title={name ?? 'User'}
      aria-label={name ? `${name} avatar` : 'User avatar'}
    >
      {hasImage ? (
        <img
          src={imageUrl ?? undefined}
          alt={name ? `${name} avatar` : 'User avatar'}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitial(name)
      )}
    </span>
  );
};

export default Avatar;
