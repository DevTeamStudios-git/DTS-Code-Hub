import { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import { api } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface Achievement {
  id: string;
  badgeType: string;
  earnedAt: string;
  metadata: Record<string, unknown> | null;
}

interface Props {
  username: string;
}

const BADGE_ICONS: Record<string, string> = {
  first_commit: '🌱',
  early_adopter: '⚡',
  star_collector: '⭐',
  popular: '🚀',
  contributor: '💪',
  prolific: '🔥',
  open_sourcerer: '🧙',
  streak_7: '🗡️',
  streak_30: '👑',
};

const BADGE_COLORS: Record<string, string> = {
  first_commit: '#22c55e',
  early_adopter: '#f59e0b',
  star_collector: '#eab308',
  popular: '#8B3BFE',
  contributor: '#3B5BFE',
  prolific: '#ef4444',
  open_sourcerer: '#06b6d4',
  streak_7: '#f97316',
  streak_30: '#a855f7',
};

export default function AchievementBadges({ username }: Props) {
  const { t } = useLanguage();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ achievements: Achievement[] }>(`/api/achievements/${username}`)
      .then(d => setAchievements(d.achievements))
      .catch(() => setAchievements([]));
  }, [username]);

  if (achievements.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-4 h-4 text-gray-500" />
        <span className="text-gray-500 text-sm font-medium">Achievements</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {achievements.map(a => (
          <div
            key={a.id}
            className="relative group"
            onMouseEnter={() => setHovered(a.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg cursor-default transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${BADGE_COLORS[a.badgeType] ?? '#3B5BFE'}22`, border: `2px solid ${BADGE_COLORS[a.badgeType] ?? '#3B5BFE'}55` }}
            >
              {BADGE_ICONS[a.badgeType] ?? '🏆'}
            </div>

            {hovered === a.id && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-center whitespace-nowrap z-10 shadow-xl pointer-events-none">
                <p className="text-white text-xs font-semibold">{t(`badge.${a.badgeType}`)}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">
                  {new Date(a.earnedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
