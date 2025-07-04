/**
 * Editor2 Types - Builder.io Compatible Interfaces
 * Based on Builder.io SDK structure and patterns
 */

import React from 'react';

export interface BuilderElement {
  "@type": "@builder.io/sdk:Element";
  id: string;
  component: {
    name: string;
    options: Record<string, any>;
  };
  children?: BuilderElement[];
  responsiveStyles?: {
    large?: React.CSSProperties;
    medium?: React.CSSProperties;
    small?: React.CSSProperties;
  };
  bindings?: Record<string, any>;
  actions?: Record<string, any>;
  meta?: Record<string, any>;
}

export interface BuilderPage {
  ROOT: BuilderElement;
}

export interface BuilderBlock {
  id: string;
  component: {
    name: string;
    options: Record<string, any>;
  };
  children?: BuilderBlock[];
  responsiveStyles?: {
    large?: React.CSSProperties;
    medium?: React.CSSProperties;
    small?: React.CSSProperties;
  };
}

export interface BuilderComponentProps {
  id: string;
  blocks?: BuilderElement[];
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export interface StackProps extends BuilderComponentProps {
  blocks: BuilderElement[];
  direction?: 'horizontal' | 'vertical';
  spacing?: number;
  alignItems?: string;
  justifyContent?: string;
  wrap?: boolean;
  reverseOrder?: boolean;
}

export interface MasonryProps extends BuilderComponentProps {
  blocks: BuilderElement[];
  columns?: number;
  gap?: number;
  breakpointCols?: {
    default: number;
    1100: number;
    700: number;
    500: number;
  };
}

export interface FragmentProps extends BuilderComponentProps {
  blocks: BuilderElement[];
  logicalGroup?: string;
  renderAs?: string;
  ariaLabel?: string;
  conditionalRender?: boolean;
}

export interface ColumnsProps extends BuilderComponentProps {
  blocks: BuilderElement[];
  columns?: number;
  gap?: number;
  gutterSize?: number;
  stackColumnsAt?: 'tablet' | 'mobile' | 'never';
  reverseColumnsWhenStacked?: boolean;
}

export interface BoxProps extends BuilderComponentProps {
  blocks?: BuilderElement[];
  backgroundImage?: string;
  backgroundColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  border?: string;
  minHeight?: string;
  maxWidth?: string;
}

export interface TextProps {
  id?: string;
  text: string;
  tag?: string;
  style?: React.CSSProperties;
  className?: string;
}

export interface SectionProps {
  id?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  padding?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  minHeight?: string;
}

export interface ContainerProps {
  id?: string;
  children?: React.ReactNode;
  maxWidth?: number;
  style?: React.CSSProperties;
  className?: string;
  margin?: string;
  padding?: string;
}

export interface ButtonProps {
  id?: string;
  text: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

export interface ImageProps {
  id?: string;
  src: string;
  alt: string;
  style?: React.CSSProperties;
  className?: string;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  lazyLoad?: boolean;
  aspectRatio?: number;
}

export interface ComponentMap {
  [key: string]: React.ComponentType<any>;
}

export interface ComponentMapContextType {
  componentMap: ComponentMap;
}

export interface PageContextType {
  pageData: BuilderPage | null;
  setPageData: (data: BuilderPage | null) => void;
  isLoading: boolean;
}

export interface EditorContextType {
  selectedElementId: string | null;
  hoveredElementId: string | null;
  mode: 'edit' | 'preview';
  showGrid: boolean;
  setSelectedElementId: (id: string | null) => void;
  setHoveredElementId: (id: string | null) => void;
  setMode: (mode: 'edit' | 'preview') => void;
  setShowGrid: (show: boolean) => void;
}

export type ResponsiveValue<T> = {
  large?: T;
  medium?: T;
  small?: T;
};

export type BuilderStyleValue = string | number | ResponsiveValue<string | number>;

export interface BuilderStyles {
  [key: string]: BuilderStyleValue;
}