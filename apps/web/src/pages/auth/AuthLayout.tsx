import { Link } from 'react-router-dom';
import Logo from '../../components/Logo';

interface Props {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: Props) {
  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex flex-col items-center gap-3 group">
            <Logo className="w-14 h-14" />
            <span className="text-white font-bold text-xl">DTS Code Hub</span>
          </Link>
          <h1 className="mt-4 text-gray-200 text-lg font-medium text-center">{title}</h1>
          {subtitle && <p className="mt-1 text-gray-500 text-sm text-center">{subtitle}</p>}
        </div>

        {/* Card */}
        <div className="bg-navy-800 border border-gray-800 rounded-xl p-6 shadow-2xl">
          {children}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-gray-600 text-xs">
          DTS Code Hub · Build • Collaborate • Innovate
        </p>
      </div>
    </div>
  );
}
