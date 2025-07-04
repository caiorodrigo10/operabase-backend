import React from 'react';
import { CanvasProps } from '../../../types/editor2';

export const CanvasArea: React.FC<CanvasProps> = ({ content }) => {
  return (
    <div className="editor2-canvas">
      <div className="editor2-canvas-content">
        <div className="editor2-canvas-placeholder">
          <h2>Canvas Area</h2>
          <p>Drag and drop elements to start building your page</p>
        </div>
      </div>
    </div>
  );
};