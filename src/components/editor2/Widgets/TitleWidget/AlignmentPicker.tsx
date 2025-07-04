import React from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

interface AlignmentPickerProps {
  currentAlignment: 'left' | 'center' | 'right' | 'justify';
  onAlignmentChange: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  onClose: () => void;
}

export const AlignmentPicker: React.FC<AlignmentPickerProps> = ({ 
  currentAlignment, 
  onAlignmentChange, 
  onClose 
}) => {
  const alignments = [
    { value: 'left' as const, icon: AlignLeft, label: 'Align Left' },
    { value: 'center' as const, icon: AlignCenter, label: 'Align Center' },
    { value: 'right' as const, icon: AlignRight, label: 'Align Right' },
    { value: 'justify' as const, icon: AlignJustify, label: 'Justify' },
  ];

  return (
    <div className="dropdown-menu alignment-picker">
      <div className="alignment-grid">
        {alignments.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            className={`alignment-button ${currentAlignment === value ? 'active' : ''}`}
            onClick={() => onAlignmentChange(value)}
            title={label}
          >
            <Icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
};