'use client';
import React from 'react';

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="page-flex-wrapper">
      <div className="ad-space ad-left">
        {/* Adsense code can be inserted here */}
      </div>
      <main className="main-content">
        {children}
      </main>
      <div className="ad-space ad-right">
        {/* Adsense code can be inserted here */}
      </div>
    </div>
  );
} 