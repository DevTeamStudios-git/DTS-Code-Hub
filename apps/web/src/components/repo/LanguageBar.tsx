interface Language {
  language: string;
  color: string;
  percentage: number;
}

interface Props {
  languages: Language[];
  showLabels?: boolean;
}

export default function LanguageBar({ languages, showLabels = true }: Props) {
  if (!languages || languages.length === 0) return null;

  return (
    <div>
      {/* Bar */}
      <div className="flex rounded-full overflow-hidden h-2 gap-px">
        {languages.map((lang) => (
          <div
            key={lang.language}
            style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
            title={`${lang.language} ${lang.percentage}%`}
          />
        ))}
      </div>

      {/* Labels */}
      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
          {languages.map((lang) => (
            <div key={lang.language} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lang.color }} />
              <span className="font-medium text-gray-300">{lang.language}</span>
              <span className="text-gray-600">{lang.percentage}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
