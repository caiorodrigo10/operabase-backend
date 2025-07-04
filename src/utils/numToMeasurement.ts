export const pxToPercent = (px: number, base: number): number => {
  return (px / base) * 100;
};

export const percentToPx = (percent: number, base: number): number => {
  return (percent / 100) * base;
};

export const getUnitType = (value: string): 'px' | '%' | 'em' | 'rem' | 'auto' => {
  if (value === 'auto') return 'auto';
  if (value.includes('%')) return '%';
  if (value.includes('em')) return 'em';
  if (value.includes('rem')) return 'rem';
  return 'px';
};

export const stripUnit = (value: string): number => {
  return parseFloat(value.replace(/[^\d.-]/g, ''));
};

export const addUnitIfNeeded = (value: string | number, defaultUnit = 'px'): string => {
  if (typeof value === 'number') {
    return `${value}${defaultUnit}`;
  }
  
  if (typeof value === 'string' && /^\d+\.?\d*$/.test(value)) {
    return `${value}${defaultUnit}`;
  }
  
  return value.toString();
};

export const isPercentage = (value: string): boolean => {
  return value.includes('%');
};

export const getElementDimensions = (element: HTMLElement | null): { width: number; height: number } => {
  if (!element || !element.getBoundingClientRect) {
    return { width: 0, height: 0 };
  }
  
  try {
    const rect = element.getBoundingClientRect();
    return {
      width: rect.width || 0,
      height: rect.height || 0
    };
  } catch (error) {
    console.warn('Error getting element dimensions:', error);
    return { width: 0, height: 0 };
  }
};