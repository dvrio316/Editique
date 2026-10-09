const Doodle = ({ children, style }) => (
  <span className="absolute select-none pointer-events-none" style={style} aria-hidden>
    {children}
  </span>
);

export default function Home({ user, online, onStart, onSkip, onLogin, onLogout, onGallery }) {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center gap-6 px-6 overflow-hidden">
      {/* account corner */}
      <div className="absolute right-4 top-4 z-10 text-right text-[#1b1b8f]">
        {user ? (
          <>
            <div className="font-marker text-sm">Hi, {user.username}!</div>
            <button className="underline text-sm" onClick={onLogout}>
              log out
            </button>
          </>
        ) : (
          online && (
            <button className="btn" style={{ minHeight: 36, padding: '0 0.8rem' }} onClick={onLogin}>
              Log in
            </button>
          )
        )}
      </div>

      <Doodle style={{ left: 28, top: 70, fontSize: 40, transform: 'rotate(-14deg)' }}>⭐</Doodle>
      <Doodle style={{ right: 30, top: 130, fontSize: 36, transform: 'rotate(12deg)' }}>❤️</Doodle>
      <Doodle style={{ left: 40, bottom: 120, fontSize: 38, transform: 'rotate(10deg)' }}>🌈</Doodle>
      <Doodle style={{ right: 36, bottom: 90, fontSize: 40, transform: 'rotate(-8deg)' }}>✨</Doodle>

      <div className="relative">
        <h1 className="title-box text-4xl px-6 py-2">Editique</h1>
        <svg className="absolute left-2 -bottom-3 w-[92%]" height="10" viewBox="0 0 200 10" preserveAspectRatio="none">
          <path d="M2 6 Q 25 0 50 6 T 100 5 T 150 6 T 198 4" fill="none" stroke="#e5484d" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      <p className="font-marker text-[#1b1b8f] text-xl text-center -rotate-2 leading-snug">
        snap 3 photos,
        <br />
        then doodle all over them!
      </p>

      {/* mini strip preview */}
      <div className="card-shadow bg-white p-2 flex flex-col gap-2 relative" style={{ width: 96 }}>
        <span className="tape" style={{ left: '50%', top: -12, marginLeft: -45, transform: 'rotate(4deg)' }} />
        {['#ff9a8b', '#ffd6e0', '#8ec5fc'].map((c) => (
          <div key={c} className="grid place-items-center text-white/80" style={{ background: c, height: 54 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <circle cx="9" cy="10" r="1.5" />
              <path d="M4 18l5-5 4 4 3-3 4 4" />
            </svg>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <button className="btn font-marker text-xl" style={{ background: '#1b1b8f', color: '#fff', padding: '0.4rem 1.6rem' }} onClick={onStart}>
          📸 Start booth
        </button>
        {user && (
          <button className="btn" onClick={onGallery}>
            🗂 My strips
          </button>
        )}
        <button className="underline text-[#1b1b8f]" onClick={onSkip}>
          or just try the doodle page
        </button>
        {!online && <p className="text-sm text-[#c0262d] text-center">Server offline: you can still doodle, but saving online is unavailable.</p>}
      </div>
    </div>
  );
}
