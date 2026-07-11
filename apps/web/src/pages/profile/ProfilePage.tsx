import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Link as LinkIcon, Building2, Calendar, Users, Star, GitBranch } from 'lucide-react';
import ContributionHeatmap from '../../components/profile/ContributionHeatmap';
import AchievementBadges from '../../components/profile/AchievementBadges';
import ProfileReadme from '../../components/profile/ProfileReadme';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface Repo {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  updatedAt: string;
  _count: { stars: number };
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  website: string | null;
  company: string | null;
  profileReadme: string | null;
  createdAt: string;
  isFollowing: boolean;
  _count: {
    repositories: number;
    followers: number;
    following: number;
    stars: number;
  };
}

type Tab = 'repos' | 'stars';

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { profile: myProfile } = useAuth();
  const { t } = useLanguage();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [tab, setTab] = useState<Tab>('repos');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwn = myProfile?.username === username;

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    Promise.all([
      api.get<{ user: UserProfile }>(`/api/users/${username}`),
      api.get<{ repos: Repo[] }>(`/api/users/${username}/repos`),
    ]).then(([userData, repoData]) => {
      setUser(userData.user);
      setRepos(repoData.repos);
      setFollowing(userData.user.isFollowing);
    }).catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [username]);

  const handleFollow = async () => {
    if (!user) return;
    setFollowLoading(true);
    try {
      if (following) {
        await api.delete(`/api/users/${username}/follow`);
        setFollowing(false);
        setUser(u => u ? { ...u, _count: { ...u._count, followers: u._count.followers - 1 } } : u);
      } else {
        await api.post(`/api/users/${username}/follow`);
        setFollowing(true);
        setUser(u => u ? { ...u, _count: { ...u._count, followers: u._count.followers + 1 } } : u);
      }
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-start border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 text-lg">User not found</p>
        <Link to="/" className="text-accent-start hover:underline text-sm">Go home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="lg:w-64 shrink-0">
            {/* Avatar */}
            <div className="mb-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-full max-w-[260px] rounded-full border-2 border-gray-800 aspect-square object-cover"
                />
              ) : (
                <div
                  className="w-full max-w-[260px] aspect-square rounded-full border-2 border-gray-800 flex items-center justify-center text-6xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #3B5BFE, #8B3BFE)' }}
                >
                  {user.username[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Name */}
            <h1 className="text-white text-xl font-bold">{user.displayName ?? user.username}</h1>
            <p className="text-gray-500 text-base mb-3">@{user.username}</p>

            {user.bio && <p className="text-gray-300 text-sm mb-4 leading-relaxed">{user.bio}</p>}

            {/* Follow / Edit */}
            {isOwn ? (
              <Link
                to="/settings/profile"
                className="block w-full text-center py-1.5 px-4 border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 text-sm transition-colors mb-4"
              >
                {t('profile.editProfile')}
              </Link>
            ) : myProfile ? (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className={`w-full py-1.5 px-4 rounded-lg text-sm font-medium transition-all mb-4 ${
                  following
                    ? 'border border-gray-700 text-gray-300 hover:border-red-500 hover:text-red-400'
                    : 'text-white hover:opacity-90'
                } disabled:opacity-50`}
                style={!following ? { background: 'linear-gradient(to right, #3B5BFE, #8B3BFE)' } : {}}
              >
                {following ? t('profile.unfollow') : t('profile.follow')}
              </button>
            ) : null}

            {/* Stats */}
            <div className="flex items-center gap-3 text-gray-500 text-sm mb-4">
              <Link to={`/${username}?tab=followers`} className="flex items-center gap-1 hover:text-white transition-colors">
                <Users className="w-4 h-4" />
                <span className="font-medium text-white">{user._count.followers}</span>
                <span>{t('profile.followers')}</span>
              </Link>
              <span>·</span>
              <Link to={`/${username}?tab=following`} className="flex items-center gap-1 hover:text-white transition-colors">
                <span className="font-medium text-white">{user._count.following}</span>
                <span>{t('profile.following')}</span>
              </Link>
            </div>

            {/* Meta */}
            <div className="space-y-2">
              {user.company && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>{user.company}</span>
                </div>
              )}
              {user.location && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{user.location}</span>
                </div>
              )}
              {user.website && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <LinkIcon className="w-4 h-4 shrink-0" />
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-accent-start hover:underline truncate">
                    {user.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            {/* Achievements */}
            <AchievementBadges username={user.username} />
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Profile README */}
            {user.profileReadme && (
              <div className="mb-6">
                <ProfileReadme content={user.profileReadme} />
              </div>
            )}

            {/* Contribution heatmap */}
            <div className="mb-6">
              <ContributionHeatmap username={user.username} />
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-800 mb-6">
              <div className="flex gap-0">
                {(['repos', 'stars'] as Tab[]).map(t2 => (
                  <button
                    key={t2}
                    onClick={() => setTab(t2)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      tab === t2
                        ? 'border-accent-start text-white'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {t2 === 'repos' ? (
                      <><GitBranch className="w-4 h-4" />{t('profile.repositories')} <span className="bg-gray-800 text-gray-400 text-xs px-1.5 py-0.5 rounded-full">{user._count.repositories}</span></>
                    ) : (
                      <><Star className="w-4 h-4" />{t('profile.stars')} <span className="bg-gray-800 text-gray-400 text-xs px-1.5 py-0.5 rounded-full">{user._count.stars}</span></>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Repos */}
            {tab === 'repos' && (
              <div className="space-y-3">
                {repos.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">{t('profile.noRepos')}</div>
                ) : repos.map(repo => (
                  <div key={repo.id} className="bg-navy-800 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            to={`/${username}/${repo.name}`}
                            className="text-accent-start hover:underline font-semibold text-base truncate"
                          >
                            {repo.name}
                          </Link>
                          <span className="text-gray-600 text-xs border border-gray-700 rounded-full px-2 py-0.5 shrink-0">
                            {repo.visibility === 'PUBLIC' ? t('common.public') : t('common.private')}
                          </span>
                        </div>
                        {repo.description && (
                          <p className="text-gray-400 text-sm leading-relaxed">{repo.description}</p>
                        )}
                        <p className="text-gray-600 text-xs mt-2">
                          Updated {new Date(repo.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm shrink-0">
                        <Star className="w-4 h-4" />
                        <span>{repo._count.stars}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'stars' && (
              <div className="text-center py-12 text-gray-600">Stars coming in Phase 5</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
