const sizes = {
  sm: 'w-8 h-8 rounded-lg text-xs',
  md: 'w-10 h-10 rounded-xl text-sm',
  lg: 'w-12 h-12 rounded-xl text-lg',
};

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: keyof typeof sizes;
}

export function UserAvatar({ name, avatarUrl, size = 'md' }: UserAvatarProps) {
  const cls = sizes[size];
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name || 'Profil'} className={`${cls} object-cover border border-[#23293a] shrink-0`} referrerPolicy="no-referrer" />;
  }
  return (
    <div className={`${cls} bg-[#2563eb] flex items-center justify-center font-bold text-white shrink-0`}>
      {name ? name.charAt(0).toUpperCase() : 'U'}
    </div>
  );
}
