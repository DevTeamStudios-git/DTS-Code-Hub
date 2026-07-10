const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B5BFE" />
          <stop offset="100%" stopColor="#8B3BFE" />
        </linearGradient>
      </defs>
      {/* Outer orbit ring */}
      <circle cx="50" cy="50" r="45" stroke="url(#logoGradient)" strokeWidth="3" fill="none" opacity="0.3" />
      
      {/* Inner orbit ring */}
      <circle cx="50" cy="50" r="35" stroke="url(#logoGradient)" strokeWidth="2" fill="none" opacity="0.5" />
      
      {/* Code brackets </> */}
      <text x="50" y="58" textAnchor="middle" fill="url(#logoGradient)" fontSize="24" fontWeight="bold" fontFamily="monospace">
        &lt;/&gt;
      </text>
      
      {/* Bunny silhouette - simplified */}
      <ellipse cx="50" cy="50" rx="12" ry="10" fill="url(#logoGradient)" opacity="0.8" />
      <ellipse cx="45" cy="38" rx="3" ry="8" fill="url(#logoGradient)" opacity="0.8" transform="rotate(-15 45 38)" />
      <ellipse cx="55" cy="38" rx="3" ry="8" fill="url(#logoGradient)" opacity="0.8" transform="rotate(15 55 38)" />
    </svg>
  );
};

export default Logo;
