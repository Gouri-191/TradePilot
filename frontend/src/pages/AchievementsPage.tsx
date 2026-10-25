import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { PendingGraceBanner } from '../components/common/PendingGraceBanner';
import {
  Award,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Zap,
  BarChart2,
  Calendar,
  Compass,
  Sliders
} from 'lucide-react';
import { Achievement } from '../types';

export const AchievementsPage: React.FC = () => {
  const { experienceLevel, setExperienceLevel, refreshAll, showToast } = useApp();
  const [badges, setBadges] = useState<Achievement[]>([]);
  const [progression, setProgression] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchAchievements = async () => {
    try {
      const data = await api.getAchievements();
      setBadges(data.badges);
      setProgression(data.progression);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAchievements();
  }, []);

  const handleRequestPromotion = async (tier: 'medium' | 'pro') => {
    setLoading(true);
    try {
      await api.requestPromotion(tier);
      showToast(`Interface successfully promoted to ${tier.toUpperCase()} tier with explicit consent.`, 'success');
      await refreshAll();
      await fetchAchievements();
    } catch (e: any) {
      showToast(e.message || 'Promotion criteria not yet satisfied', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Compass': return Compass;
      case 'BookOpen': return BookOpen;
      case 'Sliders': return Sliders;
      case 'BarChart2': return BarChart2;
      case 'ShieldCheck': return ShieldCheck;
      case 'Zap': return Zap;
      case 'Calendar': return Calendar;
      default: return Award;
    }
  };

  return (
    <div className="space-y-6">
      <PendingGraceBanner />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Learning Milestones & Progression
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Demonstrated mastery unlocks interface tiers with your explicit consent
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl gradient-badge-blue text-xs font-semibold shadow-md">
          <Sparkles className="w-4 h-4" />
          <span>Current Tier: {experienceLevel.toUpperCase()}</span>
        </div>
      </div>

      {/* Progression Qualification Card */}
      {progression && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/20 space-y-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
            <div>
              <span className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
                Experience Qualification Status
              </span>
              <h2 className="text-xl font-bold">
                {progression.unlocked_badges_count} of {progression.total_badges_count} Badges Earned
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {progression.medium_eligible && experienceLevel === 'beginner' && (
                <button
                  onClick={() => handleRequestPromotion('medium')}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-all shadow-md"
                >
                  Consent & Upgrade to Medium Tier
                </button>
              )}

              {progression.pro_eligible && experienceLevel !== 'pro' && (
                <button
                  onClick={() => handleRequestPromotion('pro')}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl bg-white text-blue-700 font-bold text-xs hover:bg-blue-50 transition-all shadow-md"
                >
                  Consent & Upgrade to Pro Tier
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-blue-100 max-w-2xl leading-relaxed relative z-10">
            {progression.rule_notice}
          </p>
        </div>
      )}

      {/* Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {badges.map(b => {
          const Icon = getIcon(b.icon);
          return (
            <div
              key={b.id}
              className={`p-5 rounded-2xl text-xs transition-all flex flex-col justify-between relative overflow-hidden ${
                b.is_unlocked
                  ? 'glass-panel border-emerald-500/40 shadow-[0_8px_30px_rgba(16,185,129,0.12)]'
                  : 'glass-panel-hover opacity-80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`p-2.5 rounded-xl ${
                      b.is_unlocked
                        ? 'gradient-badge-emerald'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {b.is_unlocked ? (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Lock className="w-3.5 h-3.5" /> In Progress
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  {b.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                  {b.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Criteria:</span>{' '}
                {b.criteria}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
