import { useRef, useState } from 'react';

// positions inside the booth drawing, as fractions of its width / height
const SLOT = { x: 59 / 300, y: 231 / 330 };
const COIN = { x: 225 / 300, y: 272 / 330 };

// tiny "ka-ching" made with the Web Audio API (silently skipped if the device blocks it)
function clink() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.start(t);
      o.stop(t + 0.26);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* no sound, that's fine */
  }
}

const Sparkle = ({ ch, style }) => (
  <span aria-hidden className="sparkle" style={style}>
    {ch}
  </span>
);

// The booth: drag the coin from the table into the coin slot to go to the frames.
function CoinBooth({ onStart }) {
  const box = useRef(null);
  const drag = useRef(null);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [state, setState] = useState('rest'); // rest | drag | back | in
  const [near, setNear] = useState(false);
  const [hint, setHint] = useState(false);

  const geo = () => {
    const r = box.current.getBoundingClientRect();
    return { r, x: (SLOT.x - COIN.x) * r.width, y: (SLOT.y - COIN.y) * r.height };
  };
  const insert = () => {
    const g = geo();
    setNear(false);
    setOff({ x: g.x, y: g.y });
    setState('in');
    clink();
    setTimeout(onStart, 1000);
  };
  const down = (e) => {
    if (state === 'in') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX - off.x, sy: e.clientY - off.y, x: off.x, y: off.y, moved: 0 };
    setHint(false);
    setState('drag');
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    d.x = e.clientX - d.sx;
    d.y = e.clientY - d.sy;
    d.moved = Math.max(d.moved, Math.hypot(d.x, d.y));
    setOff({ x: d.x, y: d.y });
    const g = geo();
    setNear(Math.hypot(d.x - g.x, d.y - g.y) < g.r.width * 0.11);
  };
  const up = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const g = geo();
    if (Math.hypot(d.x - g.x, d.y - g.y) < g.r.width * 0.11) return insert();
    setNear(false);
    setOff({ x: 0, y: 0 });
    setState('back');
    if (d.moved < 8) setHint(true); // a plain tap: remind how it works
    setTimeout(() => setState('rest'), 450);
    setTimeout(() => setHint(false), 2200);
  };
  const key = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (state !== 'in') insert();
    }
  };

  const transform =
    state === 'in'
      ? `translate(-50%,-50%) translate(${off.x}px,${off.y}px) scale(0.3) rotateY(80deg)`
      : state === 'drag'
        ? `translate(-50%,-50%) translate(${off.x}px,${off.y}px) scale(1.18) rotate(-8deg)`
        : `translate(-50%,-50%) translate(${off.x}px,${off.y}px)`;

  return (
    <div ref={box} className="booth relative w-full max-w-[380px] mx-auto select-none" style={{ aspectRatio: '300 / 330' }}>
      <svg viewBox="0 0 300 330" className="absolute inset-0 w-full h-full" fill="none" stroke="#151515" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <g className="booth-body" style={{ filter: 'url(#wobble)' }}>
          {/* sign with blinking bulbs */}
          <rect x="52" y="6" width="196" height="36" fill="#fff" />
          <rect x="58" y="11" width="184" height="26" strokeWidth="1.6" />
          <text x="150" y="30" textAnchor="middle" fontFamily="Montserrat, sans-serif" fontSize="15" letterSpacing="3" fill="#151515" stroke="none">PHOTOBOOTH</text>
          {[64, 100, 136, 172, 208, 236].map((x, i) => (
            <circle key={x} className="bulb" cx={x} cy="8.5" r="2.6" fill="#d9d9d9" strokeWidth="1.2" style={{ animationDelay: `${(i % 2) * 0.6}s` }} />
          ))}
          <path d="M90 42v10M98 42v10M202 42v10M210 42v10" strokeWidth="2" />
          {/* body */}
          <rect x="18" y="52" width="264" height="196" fill="#fff" />
          <path d="M150 52v196M232 52v196" />
          {/* strips window with camera flash */}
          <rect x="30" y="66" width="108" height="72" />
          <rect x="35" y="71" width="98" height="62" strokeWidth="1.6" />
          {[48, 70, 92, 114].map((x, i) => (
            <g key={x} className="strip" style={{ animationDelay: `${i * 0.35}s` }} strokeWidth="1.4" fill={['#ececec', '#cfcfcf', '#f6f6f6', '#bdbdbd'][i]}>
              <rect x={x} y="76" width="14" height="52" />
              <path d={`M${x} 89h14M${x} 102h14M${x} 115h14`} />
            </g>
          ))}
          <rect className="flash" x="35" y="71" width="98" height="62" fill="#fff" stroke="none" />
          <text x="84" y="166" textAnchor="middle" fontFamily="Gochi Hand, cursive" fontSize="14" fill="#151515" stroke="none">featured strips</text>
          {/* coin slot */}
          <rect x="46" y="184" width="26" height="26" /><circle cx="52" cy="190" r="1.2" /><circle cx="66" cy="190" r="1.2" />
          <rect x="44" y="216" width="30" height="30" /><rect x="52" y="222" width="14" height="18" strokeWidth="2" fill="#151515" />
          {/* curtain */}
          <g className="curtain" strokeWidth="2.4">
            <path className="c1" d="M162 53c-3 40 8 80 1 130M174 53c-4 36 7 72 0 120" />
            <path className="c2" d="M187 53c-2 30 6 60 0 100M200 53c-4 36 5 70 0 124M214 53c-2 40 6 80 0 126" />
          </g>
          {/* stool */}
          <ellipse cx="190" cy="212" rx="26" ry="8" fill="#fff" />
          <path d="M190 220v22M170 246h40" strokeWidth="4" />
          {/* side window */}
          <rect x="244" y="68" width="26" height="86" /><path d="M250 80l12-6M250 140l12-6" strokeWidth="2" />
          {/* table */}
          <rect x="118" y="292" width="170" height="9" fill="#fff" />
          <path d="M130 301v24M276 301v24" strokeWidth="4" />
        </g>
      </svg>

      <Sparkle ch="✦" style={{ left: '2%', top: '8%', animationDelay: '0s' }} />
      <Sparkle ch="★" style={{ right: '1%', top: '4%', animationDelay: '0.8s' }} />
      <Sparkle ch="♥" style={{ right: '4%', top: '46%', animationDelay: '1.5s' }} />
      <Sparkle ch="✧" style={{ left: '0%', top: '52%', animationDelay: '2.2s' }} />

      <div className={`slot-ring ${near ? 'near' : ''} ${state === 'in' ? 'hit' : ''}`} style={{ left: `${SLOT.x * 100}%`, top: `${SLOT.y * 100}%` }} />
      {state === 'in' && <div className="kaching" style={{ left: `${SLOT.x * 100}%`, top: `${SLOT.y * 100 - 8}%` }}>ka-ching!</div>}

      <button
        type="button"
        className={`coin ${state}`}
        style={{ left: `${COIN.x * 100}%`, top: `${COIN.y * 100}%`, transform }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        aria-label="Coin. Drag it into the coin slot to start. Press Enter to insert it."
      >
        <svg viewBox="0 0 100 100" className="coin-face">
          <circle cx="50" cy="50" r="45" fill="#d9d9d9" stroke="#151515" strokeWidth="6" />
          <circle cx="50" cy="50" r="32" fill="none" stroke="#151515" strokeWidth="3" strokeDasharray="4 5" />
          <path d="M50 28l6.5 14 15 1.8-11 10.4 2.9 15L50 62l-13.4 7.2 2.9-15-11-10.4 15-1.8z" fill="#ffffff" stroke="#151515" strokeWidth="3" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

export default function Home({ onStart }) {
  return (
    <div className="relative flex-1 h-full flex flex-col items-center justify-center overflow-y-auto scroll-hide px-5 py-6">
      <h1 className="brand" aria-label="Editique">
        <span className="brand-hl" aria-hidden />
        {'EDITIQUE'.split('').map((c, i) => (
          <span key={i} aria-hidden className="brand-letter" style={{ animationDelay: `${i * 0.09}s, ${1.4 + i * 0.12}s` }}>
            {c}
          </span>
        ))}
      </h1>
      <p className="hand text-lg text-center -rotate-1 mb-3 tagline">photo booth · doodle studio</p>

      <CoinBooth onStart={onStart} />

      <div className="flex flex-col items-center gap-3 mt-3">

      </div>
      
    </div>
  );
}