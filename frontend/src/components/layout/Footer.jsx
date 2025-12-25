import React from 'react';
import { Footer, FooterDivider } from "flowbite-react";
import { Heart } from 'lucide-react';

function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <Footer container className="mt-8">
      <div className="w-full text-center">
        <FooterDivider />
        
        {/* Copyright Only - Clean & Simple */}
        <div className="py-4">
          <div className="flex items-center justify-center gap-2 text-base text-gray-700">
            <span>© {currentYear}</span>
            <span className="text-gray-400">•</span>
            <span>Built with</span>
            <Heart size={18} className="text-red-500 fill-red-500 animate-pulse" />
            <span>by</span>
            <span className="font-semibold text-primary">Saint Zilan</span>
          </div>
          
          {/* Version Badge */}
          <div className="mt-3 text-sm text-gray-500">
            <span className="px-3 py-1.5 bg-gray-100 rounded-full font-mono">v1.0.0</span>
          </div>
        </div>
      </div>
    </Footer>
  );
}

export default AppFooter;