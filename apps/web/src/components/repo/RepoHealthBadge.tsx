import { Activity } from 'lucide-react';

interface Props {
  score: number;
}

function getColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 80) return { bg: '#16a34a18', text: '#4ade80', label: 'Excellent' };
  if (score >= 60) return { bg: '#ca8a0418', text: '#facc15', label: 'Good' };
  if (score >= 40) return { bg: '#ea580c18', text: '#fb923c', label: 'Fair' };
  return { bg: '#dc262618', text: '#f87171', label: 'Needs work' };
}

export default function RepoHealthBadge({ score }: Props) {
  const { bg, text, label } = getColor(score);

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ background: bg, color: text, border: `1px solid ${text}33` }}
      title={`Repo health score: ${score}/100`}
    >
      <Activity className="w-3 h-3" />
      <span>{score}</span>
      <span className="opacity-70">· {label}</span>
    </div>
  );
}
