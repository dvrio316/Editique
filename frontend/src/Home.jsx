// Doodle-style booth: hand-drawn lines (wobble filter), handwriting labels, big "enter" button.
export default function Home({ user, online, onStart, onSkip, onLogin, onLogout, onGallery }) {
  const ink = '#151515';
  return (
    <div className="relative flex-1 flex flex-col items-center overflow-y-auto scroll-hide px-5 pb-6">
      <div className="self-end pt-4 text-right z-10">
        {user ? (
          <>
            <div className="hand text-base">hi, {user.username}!</div>
            <button className="underline hand text-sm" onClick={onLogout}>log out</button>
          </>
        ) : (
          online && <button className="btn" style={{ minHeight: 36 }} onClick={onLogin}>log in</button>
        )}
      </div>

      <div className="relative w-full max-w-[360px] mt-1">
        <svg viewBox="0 0 300 262" className="w-full" style={{ filter: 'url(#wobble)' }} fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {/* sign */}
          <rect x="52" y="6" width="196" height="36" fill="#fff" />
          <rect x="58" y="11" width="184" height="26" strokeWidth="1.6" />
          <text x="150" y="30" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="17" letterSpacing="3" fill={ink} stroke="none">EDITIQUE</text>
          <path d="M90 42v10M98 42v10M202 42v10M210 42v10" strokeWidth="2" />
          {/* body */}
          <rect x="18" y="52" width="264" height="196" fill="#fff" />
          <path d="M150 52v196M232 52v196" />
          {/* featured strips window */}
          <rect x="30" y="66" width="108" height="72" />
          <rect x="35" y="71" width="98" height="62" strokeWidth="1.6" />
          {[48, 70, 92, 114].map((x, i) => (
            <g key={x} strokeWidth="1.4" fill={['#ffd6e0', '#cfe8ff', '#fff3b0', '#d7f5dd'][i]}>
              <rect x={x} y="76" width="14" height="52" />
              <path d={`M${x} 89h14M${x} 102h14M${x} 115h14`} />
            </g>
          ))}
          <path d="M92 150c-6-2-9-8-6-13" strokeWidth="2.2" />
          <path d="M84 139l2-5 5 3" strokeWidth="2.2" />
          <text x="100" y="160" fontFamily="Gochi Hand, cursive" fontSize="15" fill={ink} stroke="none" transform="rotate(-4 100 160)">featured</text>
          <text x="104" y="174" fontFamily="Gochi Hand, cursive" fontSize="15" fill={ink} stroke="none" transform="rotate(-4 104 174)">strips</text>
          {/* coin + slot */}
          <rect x="46" y="184" width="26" height="26" /><circle cx="52" cy="190" r="1.2" /><circle cx="66" cy="190" r="1.2" /><path d="M59 195v8m-4-3l4 4 4-4" strokeWidth="2" />
          <rect x="44" y="216" width="30" height="30" /><rect x="52" y="222" width="14" height="18" strokeWidth="2" />
          {/* curtain */}
          <path d="M162 53c-3 40 8 80 1 130M174 53c-4 36 7 72 0 120M187 53c-2 30 6 60 0 100M200 53c-4 36 5 70 0 124M214 53c-2 40 6 80 0 126" strokeWidth="2.4" />
          {/* stool */}
          <ellipse cx="190" cy="212" rx="26" ry="8" fill="#fff" />
          <path d="M190 220v22M170 246h40" strokeWidth="4" />
          {/* side window */}
          <rect x="244" y="68" width="26" height="86" /><path d="M250 80l12-6M250 140l12-6" strokeWidth="2" />
        </svg>
        <button
          className="btn enter-btn absolute"
          style={{ left: '52%', top: '47%', transform: 'translate(-50%, -50%)', background: '#fff', minWidth: 112 }}
          onClick={onStart}
        >
          enter <span aria-hidden>⇥</span>
        </button>
      </div>

      <p className="hand text-xl text-center leading-snug -rotate-1 mt-2">snap 3 pics, then doodle all over them!</p>
      <div className="flex flex-col items-center gap-3 mt-3">
        {user && <button className="btn" onClick={onGallery}>my strips</button>}
        <button className="underline hand" onClick={onSkip}>or just try the doodle page</button>
        {!online && <p className="text-sm text-[#c0262d] text-center">Server offline: you can still doodle, but saving online is unavailable.</p>}
      </div>
    </div>
  );
}
