import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { EmergencyStopModal } from './components/common/EmergencyStopModal';
import { GlossaryModal } from './components/common/GlossaryModal';
import { OnboardingModal } from './components/common/OnboardingModal';
import { AuthModal } from './components/common/AuthModal';
import { TierUpgradeModal } from './components/common/TierUpgradeModal';

// Pages
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { TradingPage } from './pages/TradingPage';
import { StrategiesPage } from './pages/StrategiesPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { OrdersPage } from './pages/OrdersPage';
import { WalletPage } from './pages/WalletPage';
import { SessionsPage } from './pages/SessionsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { SettingsPage } from './pages/SettingsPage';

const MainAppContent: React.FC = () => {
  const { user } = useApp();

  // If not logged in, the first thing the user sees is the Login / Register screen
  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50/90 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 relative overflow-x-hidden bg-mesh-light dark:bg-mesh-dark">
      {/* Ambient luminous glow orbs */}
      <div className="fixed top-[-10%] left-[-5%] w-[45vw] h-[45vw] rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-purple-500/10 dark:bg-indigo-600/15 blur-[130px] pointer-events-none -z-10" />
      <div className="fixed top-[40%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-emerald-500/5 dark:bg-emerald-600/10 blur-[140px] pointer-events-none -z-10" />

      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/trading" element={<TradingPage />} />
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Modals */}
      <EmergencyStopModal />
      <GlossaryModal />
      <OnboardingModal />
      <AuthModal />
      <TierUpgradeModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <MainAppContent />
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
