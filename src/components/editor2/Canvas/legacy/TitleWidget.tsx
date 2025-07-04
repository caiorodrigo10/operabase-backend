import React from 'react';

export const TitleWidget = ({ widget }: { widget: any }) => {
  return (
    <div className="title-widget">
      <h2>{widget?.content?.text || 'Title Widget'}</h2>
    </div>
  );
}; 