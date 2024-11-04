"use client";
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Popup: React.FC<PopupProps> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-black/80 via-blue-900/40 to-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[10px] opacity-50">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/20 rounded-full filter blur-3xl animate-pulse" />
            <div className="absolute top-1/3 right-1/3 w-48 h-48 bg-purple-500/20 rounded-full filter blur-3xl animate-pulse delay-300" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-cyan-500/20 rounded-full filter blur-3xl animate-pulse delay-500" />
          </div>
        </div>
      </div>

      {/* Popup container */}
      <div className="relative w-11/12 max-w-3xl max-h-[90vh] overflow-y-auto animate-scaleUp">
        <div className="relative overflow-hidden backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          
          {/* Content container */}
          <div className="relative bg-gray-900/90 p-8">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-300 group"
              aria-label="Close"
            >
              <X className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Main content */}
            <div className="text-gray-100 space-y-6 mt-4">
              {children}
            </div>

            {/* Bottom decoration */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-50" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Add new animation to tailwind config
const tailwindConfig = {
  theme: {
    extend: {
      keyframes: {
        scaleUp: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        scaleUp: 'scaleUp 0.3s ease-out forwards',
      },
    },
  },
};

export default Popup;