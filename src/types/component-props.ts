/**
 * Component-specific prop interfaces
 */

import { BlockComponentProps } from './editor2-types';

export interface HeroSectionProps extends BlockComponentProps {
  title?: string;
  subtitle?: string;
  background?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  padding?: number[];
  margin?: number[];
  height?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface LandingCardProps extends BlockComponentProps {
  title?: string;
  description?: string;
  background?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  margin?: number[];
  shadow?: number;
  borderRadius?: string;
  padding?: string;
}

export interface DividerProps extends BlockComponentProps {
  height?: number;
  color?: string;
  width?: string;
  margin?: string;
}

export interface SpacerProps extends BlockComponentProps {
  height?: number;
}

export interface VideoProps extends BlockComponentProps {
  url?: string;
  aspectRatio?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
}

export interface FormProps extends BlockComponentProps {
  action?: string;
  method?: 'GET' | 'POST';
  fields?: Array<{
    type: string;
    name: string;
    label: string;
    required?: boolean;
  }>;
  submitText?: string;
  successMessage?: string;
  errorMessage?: string;
}

export interface TestimonialProps extends BlockComponentProps {
  quote?: string;
  author?: string;
  role?: string;
  company?: string;
  avatar?: string;
  rating?: number;
  backgroundColor?: string;
  textColor?: string;
}

export interface DefaultComponentProps extends BlockComponentProps {
  componentName?: string;
  errorMessage?: string;
} 