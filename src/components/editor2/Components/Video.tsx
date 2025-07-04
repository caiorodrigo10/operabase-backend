import React from 'react';
import { BlockComponentProps } from '../../../types/editor2-types';

interface VideoProps extends BlockComponentProps {
  src?: string;
  type?: 'youtube' | 'vimeo' | 'direct';
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  aspectRatio?: string;
}

export const Video: React.FC<VideoProps> = ({
  id,
  children,
  className = '',
  responsiveStyles = {},
  styles = {},
  // Video-specific props
  src,
  type = 'direct',
  autoplay = false,
  controls = true,
  muted = false,
  loop = false,
  poster,
  aspectRatio = '16:9',
  ...props
}) => {
  // Função para detectar tipo de vídeo automaticamente
  const detectVideoType = (url: string): 'youtube' | 'vimeo' | 'direct' => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    return 'direct';
  };

  // Função para extrair ID do YouTube
  const extractYouTubeId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Função para extrair ID do Vimeo
  const extractVimeoId = (url: string): string | null => {
    const regex = /vimeo\.com\/(?:channels\/[^\/]+\/|groups\/[^\/]+\/videos\/|album\/\d+\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Combinar estilos base
  const combinedStyles = {
    width: '100%',
    aspectRatio,
    ...styles,
  };

  // Aplicar estilos responsivos
  const getResponsiveStyles = () => {
    if (typeof window === 'undefined') return combinedStyles;
    
    const viewportWidth = window.innerWidth;
    if (viewportWidth >= 1024 && responsiveStyles.large) {
      return { ...combinedStyles, ...responsiveStyles.large };
    } else if (viewportWidth >= 768 && responsiveStyles.medium) {
      return { ...combinedStyles, ...responsiveStyles.medium };
    } else if (viewportWidth < 768 && responsiveStyles.small) {
      return { ...combinedStyles, ...responsiveStyles.small };
    }
    
    return combinedStyles;
  };

  const finalStyles = getResponsiveStyles();

  if (!src) {
    return (
      <div
        className={`editor2-video-placeholder ${className}`.trim()}
        style={finalStyles}
      >
        <div className="placeholder-content">
          <p>Configurar vídeo</p>
        </div>
      </div>
    );
  }

  const videoType = type === 'direct' ? detectVideoType(src) : type;

  // Renderizar YouTube
  if (videoType === 'youtube') {
    const videoId = extractYouTubeId(src);
    if (!videoId) return <div>URL do YouTube inválida</div>;

    const youtubeParams = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      controls: controls ? '1' : '0',
      mute: muted ? '1' : '0',
      loop: loop ? '1' : '0',
    });

    return (
      <div
        className={`editor2-video editor2-video-youtube ${className}`.trim()}
        style={finalStyles}
      >
        <iframe
          id={id}
          src={`https://www.youtube.com/embed/${videoId}?${youtubeParams}`}
          title="YouTube video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%' }}
          {...props}
        />
      </div>
    );
  }

  // Renderizar Vimeo
  if (videoType === 'vimeo') {
    const videoId = extractVimeoId(src);
    if (!videoId) return <div>URL do Vimeo inválida</div>;

    const vimeoParams = new URLSearchParams({
      autoplay: autoplay ? '1' : '0',
      controls: controls ? '1' : '0',
      muted: muted ? '1' : '0',
      loop: loop ? '1' : '0',
    });

    return (
      <div
        className={`editor2-video editor2-video-vimeo ${className}`.trim()}
        style={finalStyles}
      >
        <iframe
          id={id}
          src={`https://player.vimeo.com/video/${videoId}?${vimeoParams}`}
          title="Vimeo video"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%' }}
          {...props}
        />
      </div>
    );
  }

  // Renderizar vídeo direto
  return (
    <video
      id={id}
      className={`editor2-video editor2-video-direct ${className}`.trim()}
      style={finalStyles}
      src={src}
      poster={poster}
      autoPlay={autoplay}
      controls={controls}
      muted={muted}
      loop={loop}
      {...props}
    />
  );
};

// Metadata para o Editor2
Video.displayName = 'Video';