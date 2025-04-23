// src/components/AuthenticatedLayout.jsx
import React from 'react';
import Navigation from './Navigation';
import { useEvent } from '../contexts/EventContext';

function AuthenticatedLayout({ children }) {
  const { eventState } = useEvent();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {eventState.selectionType && (
        <div className="bg-blue-600 text-white py-2 text-center">
          <h1 className="text-lg font-bold">
            {eventState.selectionType === 'women' ? "Women's" : "Open"} Nationals Selection
          </h1>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}

export default AuthenticatedLayout;