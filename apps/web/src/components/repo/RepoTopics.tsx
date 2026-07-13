import { Link } from 'react-router-dom';

interface Props {
  topics: string[];
  linkable?: boolean;
}

export default function RepoTopics({ topics, linkable = true }: Props) {
  if (!topics || topics.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {topics.map((topic) =>
        linkable ? (
          <Link
            key={topic}
            to={`/explore?topic=${encodeURIComponent(topic)}`}
            className="px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors"
            style={{ background: '#3B5BFE18', color: '#7b9cff', border: '1px solid #3B5BFE33' }}
          >
            {topic}
          </Link>
        ) : (
          <span
            key={topic}
            className="px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ background: '#3B5BFE18', color: '#7b9cff', border: '1px solid #3B5BFE33' }}
          >
            {topic}
          </span>
        )
      )}
    </div>
  );
}
