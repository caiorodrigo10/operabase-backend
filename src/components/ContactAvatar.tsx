import { useState } from 'react';

interface ContactAvatarProps {
  name: string;
  profilePicture?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ContactAvatar({ 
  name, 
  profilePicture, 
  size = 'md', 
  className = '' 
}: ContactAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // Get initials from name
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  };

  // Size configurations
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  const hasValidImage = profilePicture && !imageError;

  return (
    <div className={`
      ${sizeClasses[size]} 
      rounded-full 
      flex 
      items-center 
      justify-center 
      overflow-hidden
      ${className}
    `}>
      {hasValidImage ? (
        <img
          src={profilePicture}
          alt={`Foto de ${name}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-semibold" style={{ backgroundColor: '#0f766e' }}>
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}