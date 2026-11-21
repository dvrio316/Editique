import { useState } from 'react';

export default function QrCodeScreen({ qrData, onBack, onDone }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (qrData?.access_url) {
      navigator.clipboard?.writeText(qrData.access_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* header */}
      <header className="relative flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
        <button className="icon-btn" onClick={onBack} aria-label="Back to editing" title="Back to editing">
          ‹
        </button>
        <h1 className="title-box text-base">EDITIQUE</h1>
        <span style={{ width: 40 }} />
      </header>

      {/* main content: vertically and horizontally centered */}
      <main className="flex-1 overflow-y-auto scroll-hide px-4 py-2 flex flex-col items-center justify-center gap-3">
        <h2 className="hand text-3xl font-bold text-center leading-tight">
          Your Photo Strip is Ready!
        </h2>

        {/* QR Container */}
        <div className="note w-full max-w-[340px] p-4 flex flex-col items-center gap-3">
          {qrData?.qr_code ? (
            <div className="bg-white p-3 border-2 border-[#151515] rounded-xl shadow-sm">
              <img
                src={qrData.qr_code}
                alt="QR Code for Photo Strip"
                className="w-52 h-52 block object-contain mx-auto"
              />
            </div>
          ) : (
            <div className="w-52 h-52 flex items-center justify-center border-2 border-dashed border-[#151515]">
              <p className="hand text-lg">Generating QR...</p>
            </div>
          )}

          <p className="hand text-lg text-center leading-snug px-2 text-[#151515]">
            Scan this QR code using your phone to view and download your customized photo strip.
          </p>

          {/* Expiration badge */}
          <div className="flex items-center justify-center gap-1.5 text-sm hand text-[#333] bg-[#fff] border-2 border-[#151515] px-3 py-1 rounded-full">
            <span>⏳</span>
            <span>This QR code will expire in 24 hours.</span>
          </div>

          {/* direct link fallback / copy option */}
          {qrData?.access_url && (
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs text-[#555] hover:text-[#151515] underline cursor-pointer mt-1"
              title="Copy link"
            >
              {copied ? 'Link copied! ✓' : 'Copy photo strip link'}
            </button>
          )}
        </div>
      </main>

      {/* Done / Finish button */}
      <div className="shrink-0 flex flex-col items-center pb-4">
        <button
          className="btn font-marker text-xl"
          style={{ background: '#e6e6e6', padding: '0.3rem 2.8rem' }}
          onClick={onDone}
        >
          Done ✓
        </button>
      </div>
    </div>
  );
}
