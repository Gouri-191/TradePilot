import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserConfig, ExperienceLevel, TradingProfile, WalletSummary, Order, TickerData, UserProfile } from '../types';
import { api } from '../services/api';

interface AppContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  user: UserProfile | null;
  experienceLevel: ExperienceLevel;
  setExperienceLevel: (lvl: ExperienceLevel) => Promise<void>;
  tradingProfile: TradingProfile;
  setTradingProfile: (profile: TradingProfile) => Promise<void>;
  userConfig: UserConfig | null;
  wallet: WalletSummary | null;
  ticker: TickerData | null;
  pendingProposals: Order[];
  emergencyStopActive: boolean;
  isEmergencyModalOpen: boolean;
  setIsEmergencyModalOpen: (open: boolean) => void;
  isGlossaryOpen: boolean;
  setIsGlossaryOpen: (open: boolean) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isTierUpgradeModalOpen: boolean;
  setIsTierUpgradeModalOpen: (open: boolean) => void;
  loginUser: (userOrEmail: string, pass: string) => Promise<void>;
  registerUser: (username: string, email: string, pass: string, lvl: ExperienceLevel) => Promise<void>;
  demoLogin: (tier: ExperienceLevel) => Promise<void>;
  logoutUser: () => void;
  requestTierUpgrade: (tier: ExperienceLevel) => Promise<void>;
  refreshAll: () => Promise<void>;
  showToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('tp_theme') as 'dark' | 'light') || 'dark';
  });

  // Strictly require authentication on startup: initial state is null so Login is always the start page
  const [user, setUser] = useState<UserProfile | null>(null);

  const [experienceLevel, setExperienceLevelState] = useState<ExperienceLevel>(() => {
    return user?.experience_level || 'beginner';
  });
  const [tradingProfile, setTradingProfileState] = useState<TradingProfile>('balanced');
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [pendingProposals, setPendingProposals] = useState<Order[]>([]);
  const [emergencyStopActive, setEmergencyStopActive] = useState<boolean>(false);
  
  // Modals
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isTierUpgradeModalOpen, setIsTierUpgradeModalOpen] = useState<boolean>(false);

  // Toast
  const [toasts, setToasts] = useState<{ id: string; message: string; type: string }[]>([]);

  const showToast = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const id = Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('tp_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    api.updateSettings({ active_theme: next }).catch(() => {});
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const loginUser = async (userOrEmail: string, pass: string) => {
    const res = await api.login({ username_or_email: userOrEmail, password: pass });
    setUser(res.user);
    setExperienceLevelState(res.user.experience_level);
    localStorage.setItem('tp_user', JSON.stringify(res.user));
    localStorage.setItem('tp_token', res.token);
    showToast(`Welcome back, ${res.user.username}! Logged in as ${res.user.experience_level.toUpperCase()}.`, 'success');
    setIsAuthModalOpen(false);
    await refreshAll();
  };

  const registerUser = async (username: string, email: string, pass: string, lvl: ExperienceLevel) => {
    const res = await api.register({ username, email, password: pass, experience_level: lvl });
    setUser(res.user);
    setExperienceLevelState(res.user.experience_level);
    localStorage.setItem('tp_user', JSON.stringify(res.user));
    localStorage.setItem('tp_token', res.token);
    showToast(`Account created for ${res.user.username} with ${lvl.toUpperCase()} tier!`, 'success');
    setIsAuthModalOpen(false);
    await refreshAll();
  };

  const demoLogin = async (tier: ExperienceLevel) => {
    const res = await api.demoLogin(tier);
    setUser(res.user);
    setExperienceLevelState(res.user.experience_level);
    localStorage.setItem('tp_user', JSON.stringify(res.user));
    localStorage.setItem('tp_token', res.token);
    showToast(`Logged in as Demo Trader (${tier.toUpperCase()})!`, 'success');
    setIsAuthModalOpen(false);
    await refreshAll();
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('tp_user');
    localStorage.removeItem('tp_token');
    showToast('Logged out of TradePilot.', 'info');
  };

  const requestTierUpgrade = async (tier: ExperienceLevel) => {
    try {
      const res = await api.requestTierUpgrade(tier, true);
      setExperienceLevelState(tier);
      if (user) {
        const updated = { ...user, experience_level: tier };
        setUser(updated);
        localStorage.setItem('tp_user', JSON.stringify(updated));
      }
      showToast(res.message, 'success');
      setIsTierUpgradeModalOpen(false);
      await refreshAll();
    } catch (err: any) {
      showToast(err.message || 'Promotion qualification not satisfied', 'error');
    }
  };

  const setExperienceLevel = async (lvl: ExperienceLevel) => {
    if (lvl !== 'beginner' && experienceLevel === 'beginner') {
      // Trigger modal asking for explicit consent and verifying criteria
      setIsTierUpgradeModalOpen(true);
      return;
    }
    setExperienceLevelState(lvl);
    await api.updateSettings({ experience_level: lvl });
    showToast(`Interface mode updated to ${lvl.toUpperCase()}`, 'info');
    await refreshAll();
  };

  const setTradingProfile = async (prof: TradingProfile) => {
    setTradingProfileState(prof);
    await api.updateSettings({ trading_profile: prof });
    showToast(`Trading risk profile updated to ${prof.toUpperCase()}`, 'info');
    await refreshAll();
  };

  const refreshAll = async () => {
    try {
      const [settingsData, walletData, ordersData, tickerData, meData] = await Promise.all([
        api.getSettings(),
        api.getWalletSummary(),
        api.getOrders('proposal_grace'),
        api.getTicker('BTCUSD'),
        api.getMe()
      ]);

      setUserConfig(settingsData);
      setExperienceLevelState(settingsData.experience_level || 'beginner');
      setTradingProfileState(settingsData.trading_profile);
      setEmergencyStopActive(settingsData.emergency_stop_triggered);
      setWallet(walletData);
      setPendingProposals(ordersData);
      setTicker(tickerData);

      // Check if onboarding is needed
      if (!settingsData.onboarding_completed) {
        setIsOnboardingOpen(true);
      }
    } catch (e) {
      console.error('Initial data fetch error:', e);
    }
  };

  // Polling loop for active pending order timers and market tickers
  useEffect(() => {
    refreshAll();
    const interval = setInterval(async () => {
      try {
        const [ordersData, tickerData] = await Promise.all([
          api.getOrders('proposal_grace'),
          api.getTicker('BTCUSD')
        ]);
        setPendingProposals(ordersData);
        setTicker(tickerData);
      } catch (err) {
        // silent background poll error
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        user,
        experienceLevel,
        setExperienceLevel,
        tradingProfile,
        setTradingProfile,
        userConfig,
        wallet,
        ticker,
        pendingProposals,
        emergencyStopActive,
        isEmergencyModalOpen,
        setIsEmergencyModalOpen,
        isGlossaryOpen,
        setIsGlossaryOpen,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isTierUpgradeModalOpen,
        setIsTierUpgradeModalOpen,
        loginUser,
        registerUser,
        demoLogin,
        logoutUser,
        requestTierUpgrade,
        refreshAll,
        showToast
      }}
    >
      {children}
      {/* Toast notifications display */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg shadow-xl border text-sm flex items-center justify-between transition-all duration-200 ${
              t.type === 'error'
                ? 'bg-red-950/90 border-red-500/50 text-red-200'
                : t.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : t.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
