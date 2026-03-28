import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';
import { useNotificationSound } from '../hooks/useNotificationSound';

export default function Layout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useNotificationSound();

  return (
    <div className="flex min-h-screen bg-dark-950">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-dark-900 border-b border-dark-700 px-4 py-3 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center font-black text-white text-xs">
            LK
          </div>
          <span className="font-bold text-white text-sm">LIAMKING</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-dark-300 hover:text-white hover:bg-dark-800 transition">
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
