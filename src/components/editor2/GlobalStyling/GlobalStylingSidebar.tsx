import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Type, FileText, Palette, Layout, Square } from 'lucide-react';
import { ColorPalettePage } from './ColorPalettePage';
import { TextStylingPage } from './TextStylingPage';
import { WebsiteLayoutPage } from './WebsiteLayoutPage';

interface GlobalStylingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="border-b border-gray-200 pb-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-medium text-gray-900">Estilo Global</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Alterar as configurações globais afetará o estilo de todas as páginas.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Precisa de ajuda?</span>
        <button className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors">
          <span>Assistir Vídeo</span>
          <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        </button>
      </div>
    </div>
  );
};

const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 p-2 text-left hover:bg-gray-50 hover:shadow-sm rounded-md transition-all group border-l-2 border-transparent hover:border-blue-500"
    >
      <div className="text-gray-600 group-hover:text-blue-600 transition-colors">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
        {label}
      </span>
    </button>
  );
};

const SidebarContent: React.FC<{ onNavigate: (page: 'menu' | 'color-palette' | 'text-styling' | 'website-layout') => void }> = ({ onNavigate }) => {
  const menuItems = [
    {
      id: 'text-styling',
      icon: <Type className="w-4 h-4" />,
      label: 'Estilo de Texto'
    },
    {
      id: 'add-fonts',
      icon: <FileText className="w-4 h-4" />,
      label: 'Adicionar Fontes'
    },
    {
      id: 'color-palette',
      icon: <div className="flex gap-1">
        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
      </div>,
      label: 'Paleta de Cores'
    },
    {
      id: 'website-layout',
      icon: <Layout className="w-4 h-4" />,
      label: 'Layout do Site'
    },
    {
      id: 'page-styling',
      icon: <Square className="w-4 h-4" />,
      label: 'Estilo da Página'
    }
  ];

  const handleMenuItemClick = (itemId: string, setCurrentPage: (page: 'menu' | 'color-palette' | 'text-styling' | 'website-layout') => void) => {
    if (itemId === 'color-palette') {
      setCurrentPage('color-palette');
    } else if (itemId === 'text-styling') {
      setCurrentPage('text-styling');
    } else if (itemId === 'website-layout') {
      setCurrentPage('website-layout');
    } else {
      console.log(`Navigate to ${itemId} submenu`);
      // TODO: Implement other submenus
    }
  };

  return (
    <div className="flex-1 space-y-1">
      {menuItems.map((item) => (
        <MenuItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          onClick={() => handleMenuItemClick(item.id, onNavigate)}
        />
      ))}
    </div>
  );
};

const SidebarFooter: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return null;
};

export const GlobalStylingSidebar: React.FC<GlobalStylingSidebarProps> = ({
  isOpen,
  onClose
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState<'menu' | 'color-palette' | 'text-styling' | 'website-layout'>('menu');

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Focus trap
      sidebarRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex"
      onClick={handleBackdropClick}
    >
      {/* Backdrop - Removed dark overlay */}
      
      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className="relative bg-white w-80 md:w-80 sm:w-80 xs:w-full h-full shadow-xl transform transition-transform duration-300 ease-out flex flex-col"
        style={{
          animation: isOpen ? 'slideInFromLeft 300ms ease-out' : 'slideOutToLeft 250ms ease-in'
        }}
        tabIndex={-1}
      >
        <div className="p-4 flex flex-col h-full">
          {currentPage === 'menu' ? (
            <>
              <SidebarHeader onClose={onClose} />
              <SidebarContent onNavigate={setCurrentPage} />
              <SidebarFooter onClose={onClose} />
            </>
          ) : currentPage === 'color-palette' ? (
            <ColorPalettePage onBack={() => setCurrentPage('menu')} />
          ) : currentPage === 'text-styling' ? (
            <TextStylingPage onBack={() => setCurrentPage('menu')} />
          ) : currentPage === 'website-layout' ? (
            <WebsiteLayoutPage onBack={() => setCurrentPage('menu')} />
          ) : null}
        </div>
      </div>
      
      {/* Spacer to push content */}
      <div className="flex-1" onClick={handleBackdropClick} />
    </div>
  );
};