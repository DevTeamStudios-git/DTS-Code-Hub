import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Props {
  username: string;
}

interface ContributionData {
  contributions: Record<string, number>;
  totalContributions: number;
  streak: { current: number; longest: number };
  year: number;
}

function getColor(count: number): string {
  if (count === 0) return '#1a1f2e';
  if (count <= 2) return '#1e3a5f';
  if (count <= 5) return '#1d4ed8';
  if (count <= 10) return '#3B5BFE';
  return '#8B3BFE';
}

function generateDays(year: number): Date[] {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ContributionHeatmap({ username }: Props) {
  const [data, setData] = useState<ContributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<ContributionData>(`/api/contributions/${username}?year=${year}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [username, year]);

  if (loading) {
    return <div className="h-36 bg-navy-800 rounded-lg animate-pulse" />;
  }

  const days = generateDays(year);
  // Pad so grid starts on Sunday
  const firstDayOfWeek = days[0].getDay();
  const paddedDays: (Date | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...days,
  ];

  // Group into weeks (columns)
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  const contributions = data?.contributions ?? {};

  return (
    <div className="bg-navy-800 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-white font-semibold text-sm">
            {data?.totalContributions ?? 0}
          </span>
          <span className="text-gray-500 text-sm ml-1">contributions in {year}</span>
        </div>
        <div className="flex items-center gap-3">
          {data && data.streak.current > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-orange-400 text-xs font-medium">🔥 {data.streak.current} day streak</span>
            </div>
          )}
          <div className="flex gap-1">
            {[year - 1, year].map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  y === year
                    ? 'bg-accent-start text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-0.5 min-w-max relative">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1 mt-6">
            {DAYS.map((d, i) => (
              <div key={d} className="h-3 text-gray-600 text-[9px] leading-3 w-6 text-right">
                {i % 2 === 1 ? d : ''}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {/* Month label above first day of month */}
                <div className="h-4 text-[10px] text-gray-600 leading-4">
                  {week[0] && week[0].getDate() <= 7
                    ? MONTHS[week[0].getMonth()]
                    : ''}
                </div>
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="w-3 h-3" />;
                  const dateStr = day.toISOString().split('T')[0];
                  const count = contributions[dateStr] ?? 0;
                  return (
                    <div
                      key={di}
                      className="w-3 h-3 rounded-sm cursor-pointer transition-opacity hover:opacity-80"
                      style={{ backgroundColor: getColor(count) }}
                      onMouseEnter={e => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({
                          text: `${count} contribution${count !== 1 ? 's' : ''} on ${day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
                          x: rect.left,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-3">
        <span className="text-gray-600 text-xs">Less</span>
        {[0, 2, 5, 10, 15].map(v => (
          <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(v) }} />
        ))}
        <span className="text-gray-600 text-xs">More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 text-white text-xs rounded px-2 py-1 pointer-events-none shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 36 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
