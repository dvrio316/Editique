import { useCallback, useEffect, useRef, useState } from 'react';
import { PHOTOS } from './utils.js';

const SHOTS = 3;
const OUT_W = 960;
const OUT_H = Math.round(OUT_W / (PHOTOS[0].w / PHOTOS[0].h));

// draw any image/video into a "cover"-cropped canvas matching a photo slot
function coverShot(source, sw, sh, mirror) {
  const c = document.createElement('canvas');
  c.width = OUT_W;
  c.height = OUT_H;
  const ctx = c.getContext('2d');
  const ar = OUT_W / OUT_H;
  let cw = sw;
  let ch = sh;
  if (sw / sh > ar) cw = sh * ar;
  else ch = sw / ar;
  if (mirror) {
    ctx.translate(OUT_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, OUT_W, OUT_H);
  return c.toDataURL('image/jpeg', 0.92);
}

const fileToShot = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve(coverShot(img, img.width, img.height, false));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export default function Camera({ onDone, onBack }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const fileRef = useRef(null);
  const [shots, setShots] = useState([]);
  const [count, setCount] = useState(null);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [facing, setFacing] = useState('user');
  const [flash, setFlash] = useState(false);

  // ---- camera stream ----
  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available in this browser. You can upload photos instead.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        setError('');
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
        setReady(true);
      })
      .catch(() => !cancelled && setError('We could not open the camera. Allow camera access, or upload photos instead.'));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const shot = coverShot(v, v.videoWidth, v.videoHeight, facing === 'user');
    setFlash(true);
    setTimeout(() => setFlash(false), 160);
    setShots((s) => (s.length < SHOTS ? [...s, shot] : s));
  }, [facing]);

  const startCountdown = useCallback(() => {
    if (timerRef.current) return;
    let n = 3;
    setCount(n);
    timerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setCount(null);
        capture();
      } else setCount(n);
    }, 1000);
  }, [capture]);

  // auto-run the sequence: 3-2-1, click, short pause, repeat until 3 shots
  useEffect(() => {
    if (!running) return;
    if (shots.length >= SHOTS) return setRunning(false);
    if (count !== null || !ready) return;
    const t = setTimeout(startCountdown, 700);
    return () => clearTimeout(t);
  }, [running, shots.length, count, ready, startCountdown]);

  const cancelRun = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setCount(null);
    setRunning(false);
  };

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])].slice(0, SHOTS - shots.length);
    e.target.value = '';
    const out = (await Promise.all(files.map(fileToShot))).filter(Boolean);
    setShots((s) => [...s, ...out].slice(0, SHOTS));
  };

  const full = shots.length >= SHOTS;
  const mirrored = facing === 'user';

  return (
    <>
      <header className="relative flex items-center justify-center pt-4 pb-2 shrink-0">
        <button className="absolute left-4 top-3 text-[#1b1b8f] text-3xl font-bold leading-none px-2" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h1 className="title-box text-xl">Editique</h1>
        <span className="absolute right-5 top-4 text-sm font-marker text-[#1b1b8f] -rotate-3">
          {shots.length}/{SHOTS}
        </span>
      </header>

      <main className="flex-1 overflow-y-auto scroll-hide px-4 pb-3 flex flex-col items-center gap-3">
        <p className="font-marker text-[#1b1b8f] text-lg -rotate-1 mt-1">
          {full ? 'Looking good!' : running ? 'Strike a pose…' : 'Ready for 3 shots?'}
        </p>

        {/* viewfinder */}
        <div className="relative w-full max-w-[340px] card-shadow bg-white p-2">
          <span className="tape" style={{ left: '50%', top: -14, marginLeft: -45, transform: 'rotate(-3deg)', zIndex: 5 }} />
          <div className="relative w-full overflow-hidden bg-[#222]" style={{ aspectRatio: `${PHOTOS[0].w} / ${PHOTOS[0].h}` }}>
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: mirrored ? 'scaleX(-1)' : 'none', opacity: ready ? 1 : 0 }}
            />
            {!ready && !error && (
              <div className="absolute inset-0 grid place-items-center text-white/80">Starting camera…</div>
            )}
            {error && (
              <div className="absolute inset-0 grid place-items-center text-white/90 text-center p-4 text-base">{error}</div>
            )}
            {count !== null && (
              <div className="absolute inset-0 grid place-items-center">
                <span className="font-marker text-white text-8xl drop-shadow-[0_4px_0_rgba(27,27,143,0.8)]">{count}</span>
              </div>
            )}
            {flash && <div className="absolute inset-0 bg-white" />}
          </div>
        </div>

        {/* filmstrip of the 3 shots (tap one to retake it) */}
        <div className="flex gap-2">
          {Array.from({ length: SHOTS }).map((_, i) => (
            <button
              key={i}
              disabled={!shots[i] || running}
              onClick={() => setShots((s) => s.filter((_, j) => j !== i))}
              className="relative wobbly overflow-hidden bg-[#ececec] grid place-items-center text-[#1b1b8f]/50"
              style={{ width: 82, height: 77 }}
              title={shots[i] ? 'Tap to retake this one' : `Photo ${i + 1}`}
            >
              {shots[i] ? (
                <>
                  <img src={shots[i]} alt={`Shot ${i + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute top-0 right-1 text-white text-sm drop-shadow">✕</span>
                </>
              ) : (
                <span className="font-marker text-2xl">{i + 1}</span>
              )}
            </button>
          ))}
        </div>
      </main>

      {/* controls */}
      <nav className="shrink-0 mx-3 my-3 rounded-2xl bg-[#e8e8ee] border-2 border-[#2b2b2b] px-4 py-3 flex items-center justify-center gap-5">
        <button className="tool" onClick={() => fileRef.current?.click()} disabled={full || running}>
          <span className="dot" style={{ fontSize: 20 }}>🖼</span>
          <span>Upload</span>
        </button>

        {full ? (
          <>
            <button className="tool" onClick={() => setShots([])}>
              <span className="dot" style={{ fontSize: 24 }}>↺</span>
              <span>Retake all</span>
            </button>
            <button className="tool active" onClick={() => onDone(shots)}>
              <span className="dot" style={{ width: 64, height: 64, fontSize: 30 }}>✓</span>
              <span className="font-marker">Doodle!</span>
            </button>
          </>
        ) : running ? (
          <button className="tool" onClick={cancelRun}>
            <span className="dot" style={{ width: 64, height: 64, fontSize: 24 }}>■</span>
            <span>Stop</span>
          </button>
        ) : (
          <button className="tool" onClick={() => setRunning(true)} disabled={!ready}>
            <span className="dot" style={{ width: 64, height: 64, background: '#e5484d', fontSize: 28 }}>●</span>
            <span className="font-marker">{shots.length ? 'Continue' : 'Start'}</span>
          </button>
        )}

        <button
          className="tool"
          onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          disabled={running}
        >
          <span className="dot" style={{ fontSize: 24 }}>⟲</span>
          <span>Flip</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      </nav>
    </>
  );
}
