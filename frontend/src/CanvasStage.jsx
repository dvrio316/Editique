import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Text, Image as KImage, Transformer, Group } from 'react-konva';
import { uid, useImage } from './utils.js';
import { layout } from './frames.js';

// "cover" crop so the photo fills its slot without stretching
function coverCrop(img, r) {
  const ar = r.w / r.h;
  const iar = img.width / img.height;
  if (iar > ar) {
    const w = img.height * ar;
    return { x: (img.width - w) / 2, y: 0, width: w, height: img.height };
  }
  const h = img.width / ar;
  return { x: 0, y: (img.height - h) / 2, width: img.width, height: h };
}

function PhotoSlot({ rect, src, bg }) {
  const img = useImage(src);
  return (
    <>
      <Group clipX={rect.x} clipY={rect.y} clipWidth={rect.w} clipHeight={rect.h}>
        <Rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} fill={bg} />
        {img && (
          <KImage image={img} x={rect.x} y={rect.y} width={rect.w} height={rect.h} crop={coverCrop(img, rect)} />
        )}
      </Group>
      <Rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} stroke="rgba(0,0,0,0.15)" strokeWidth={2} />
    </>
  );
}

// the locked frame: color/film holes/caption, photo slots, or an uploaded picture on top
export function FrameArt({ frame, L, color, bg, images }) {
  const overlay = useImage(frame.image);
  const holes = [];
  if (frame.holes && !frame.image) {
    for (let y = 14; y < L.h - 24; y += 36) holes.push(y);
  }
  return (
    <>
      <Rect width={L.w} height={L.h} fill={color} />
      {holes.map((y) => (
        <Group key={y}>
          <Rect x={16} y={y} width={18} height={22} cornerRadius={4} fill={frame.holeColor || '#fff'} />
          <Rect x={L.w - 34} y={y} width={18} height={22} cornerRadius={4} fill={frame.holeColor || '#fff'} />
        </Group>
      ))}
      {L.slots.map((r, i) => (
        <PhotoSlot key={i} rect={r} src={images[i]} bg={bg} />
      ))}
      {!frame.image && !frame.holes && frame.caption && (
        <Text x={0} y={L.h - 100} width={L.w} align="center" text={frame.caption} fontFamily="Libre Baskerville" fontSize={30} fill={frame.captionColor || '#151515'} />
      )}
      {overlay && <KImage image={overlay} x={0} y={0} width={L.w} height={L.h} />}
      <Rect width={L.w} height={L.h} stroke="#151515" strokeWidth={6} />
    </>
  );
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;
export const clampScale = (s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
// pen stabilizer: 0 = raw pointer, 10 = very smooth (the brush eases toward the pointer)
const easing = (s) => 1 / (1 + s * 1.2);

const CanvasStage = forwardRef(function CanvasStage(
  {
    doc, frame, tool, penColor, penSize, eraserSize, smooth, view, setView, size,
    selectedId, setSelectedId, commit, onStrokeEnd, onDuplicate, onDelete,
  },
  ref
) {
  const L = layout(frame);
  const CARD_W = L.w;
  const CARD_H = L.h;
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const trRef = useRef(null);
  const decoRef = useRef(null);
  const drawing = useRef(false);
  const liveRef = useRef(null);
  const brush = useRef(null); // smoothed brush position
  const target = useRef(null); // latest raw pointer position
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const panRef = useRef(null);
  const spaceRef = useRef(false);
  const viewRef = useRef(view);
  const smoothRef = useRef(smooth);
  viewRef.current = view;
  smoothRef.current = smooth;
  const [live, setLive] = useState(null);
  const [box, setBox] = useState(null);
  const [fontTick, setFontTick] = useState(0);

  useEffect(() => {
    document.fonts?.ready.then(() => setFontTick((t) => t + 1));
  }, []);

  // export only the card (not the pan/zoom viewport, shadow or selection box)
  useImperativeHandle(ref, () => ({
    toDataURL() {
      const stage = stageRef.current;
      const tr = trRef.current;
      const deco = decoRef.current;
      const prev = { width: stage.width(), height: stage.height(), scaleX: stage.scaleX(), scaleY: stage.scaleY(), x: stage.x(), y: stage.y() };
      tr?.hide();
      deco?.hide();
      stage.setAttrs({ width: CARD_W, height: CARD_H, scaleX: 1, scaleY: 1, x: 0, y: 0 });
      const url = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
      stage.setAttrs(prev);
      tr?.show();
      deco?.show();
      stage.batchDraw();
      return url;
    },
  }));

  const selectable = tool === 'select';

  const updateBox = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !selectedId) return setBox(null);
    const node = stage.findOne('#' + selectedId);
    if (!node) return setBox(null);
    setBox(node.getClientRect());
  }, [selectedId]);

  useEffect(() => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;
    const node = selectedId && selectable ? stage.findOne('#' + selectedId) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
    if (node) updateBox();
    else setBox(null);
  }, [selectedId, selectable, doc.items, view.scale, view.x, view.y, updateBox, fontTick]);

  // wheel / trackpad: ctrl (or pinch on a trackpad) zooms at the cursor, plain scroll pans
  useEffect(() => {
    const el = wrapRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const v = viewRef.current;
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const scale = clampScale(v.scale * Math.exp(-e.deltaY * 0.01));
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        setView({ scale, x: cx - ((cx - v.x) * scale) / v.scale, y: cy - ((cy - v.y) * scale) / v.scale });
      } else {
        setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setView]);

  // hold Space to pan with the mouse
  useEffect(() => {
    const typing = (e) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName);
    const down = (e) => e.code === 'Space' && !typing(e) && ((spaceRef.current = true), e.preventDefault());
    const up = (e) => e.code === 'Space' && (spaceRef.current = false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // ---- drawing ----
  const pos = () => stageRef.current.getRelativePointerPosition();

  const handleDown = (e) => {
    const ev = e.evt;
    if (tool === 'hand' || ev.button === 1 || spaceRef.current) {
      panRef.current = { x: ev.clientX, y: ev.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
      return;
    }
    if (tool === 'select') {
      if (e.target === e.target.getStage()) setSelectedId(null);
      return;
    }
    const p = pos();
    if (!p) return;
    drawing.current = true;
    setSelectedId(null);
    brush.current = p;
    target.current = p;
    liveRef.current = {
      id: uid(),
      type: 'stroke',
      erase: tool === 'eraser',
      color: penColor,
      size: tool === 'eraser' ? eraserSize : penSize,
      points: [p.x, p.y, p.x, p.y],
      visible: true,
    };
    setLive(liveRef.current);
  };

  const handleMove = (e) => {
    if (panRef.current) {
      const pr = panRef.current;
      setView((v) => ({ ...v, x: pr.vx + e.evt.clientX - pr.x, y: pr.vy + e.evt.clientY - pr.y }));
      return;
    }
    if (!drawing.current || !liveRef.current) return;
    const p = pos();
    if (!p) return;
    target.current = p;
    const a = tool === 'eraser' ? 1 : easing(smoothRef.current);
    const b = brush.current;
    const nb = { x: b.x + (p.x - b.x) * a, y: b.y + (p.y - b.y) * a };
    brush.current = nb;
    liveRef.current = { ...liveRef.current, points: [...liveRef.current.points, nb.x, nb.y] };
    setLive(liveRef.current);
  };

  useEffect(() => {
    const end = (ev) => {
      pointers.current.delete(ev.pointerId);
      if (pointers.current.size < 2) gesture.current = null;
      if (pointers.current.size === 0) panRef.current = null;
      if (!drawing.current) return;
      drawing.current = false;
      const s = liveRef.current;
      liveRef.current = null;
      setLive(null);
      if (!s) return;
      // let the smoothed brush catch up with the pointer so the line ends where you lifted
      const t = target.current;
      const a = s.erase ? 1 : easing(smoothRef.current);
      let b = brush.current;
      const pts = [...s.points];
      for (let i = 0; i < 40 && Math.hypot(t.x - b.x, t.y - b.y) > 0.5; i++) {
        b = { x: b.x + (t.x - b.x) * a, y: b.y + (t.y - b.y) * a };
        pts.push(b.x, b.y);
      }
      onStrokeEnd({ ...s, points: pts });
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [onStrokeEnd]);

  // two-finger pinch: zoom + pan together (cancels a stroke the first finger started)
  const onDownCapture = (e) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      e.stopPropagation();
      drawing.current = false;
      liveRef.current = null;
      setLive(null);
      panRef.current = null;
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        d: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        v: viewRef.current,
      };
    }
  };
  const onMoveCapture = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture.current || pointers.current.size < 2) return;
    e.stopPropagation();
    const [a, b] = [...pointers.current.values()];
    const g = gesture.current;
    const rect = wrapRef.current.getBoundingClientRect();
    const scale = clampScale((g.v.scale * Math.hypot(a.x - b.x, a.y - b.y)) / g.d);
    const px = (g.cx - rect.left - g.v.x) / g.v.scale; // card point under the fingers at the start
    const py = (g.cy - rect.top - g.v.y) / g.v.scale;
    setView({
      scale,
      x: (a.x + b.x) / 2 - rect.left - px * scale,
      y: (a.y + b.y) / 2 - rect.top - py * scale,
    });
  };

  // ---- item updates ----
  const patch = (id, props) =>
    commit((d) => ({ ...d, items: d.items.map((it) => (it.id === id ? { ...it, ...props } : it)) }));

  const onTransformEnd = (item, e) => {
    const n = e.target;
    patch(item.id, {
      x: n.x(),
      y: n.y(),
      rotation: n.rotation(),
      scaleX: n.scaleX(),
      scaleY: n.scaleY(),
    });
  };

  const renderItem = (it) => {
    if (it.visible === false) return null;
    if (it.type === 'stroke') {
      return (
        <Line
          key={it.id}
          points={it.points}
          stroke={it.color}
          strokeWidth={it.size}
          lineCap="round"
          lineJoin="round"
          tension={0.35}
          globalCompositeOperation={it.erase ? 'destination-out' : 'source-over'}
          listening={false}
        />
      );
    }
    const common = {
      id: it.id,
      key: it.id,
      x: it.x,
      y: it.y,
      rotation: it.rotation || 0,
      scaleX: it.scaleX ?? 1,
      scaleY: it.scaleY ?? 1,
      draggable: selectable,
      listening: selectable,
      onPointerDown: () => selectable && setSelectedId(it.id),
      onDragMove: updateBox,
      onTransform: updateBox,
      onDragEnd: (e) => patch(it.id, { x: e.target.x(), y: e.target.y() }),
      onTransformEnd: (e) => onTransformEnd(it, e),
    };
    if (it.type === 'sticker') {
      return (
        <Text
          {...common}
          text={it.emoji}
          width={100}
          height={100}
          offsetX={50}
          offsetY={50}
          fontSize={72}
          align="center"
          verticalAlign="middle"
        />
      );
    }
    // text
    const style = `${it.italic ? 'italic ' : ''}${it.bold ? 'bold' : 'normal'}`;
    return (
      <Text
        {...common}
        text={it.text}
        width={360}
        offsetX={180}
        align="center"
        wrap="word"
        fontFamily={it.fontFamily}
        fontSize={it.fontSize}
        fontStyle={style}
        fill={it.fill}
      />
    );
  };

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0"
      style={{ touchAction: 'none', cursor: tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
      onPointerDownCapture={onDownCapture}
      onPointerMoveCapture={onMoveCapture}
    >
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={view.scale}
        scaleY={view.scale}
        x={view.x}
        y={view.y}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
      >
        {/* hand-drawn drop shadow (hidden when exporting) */}
        <Layer ref={decoRef} listening={false}>
          <Rect x={8} y={10} width={CARD_W} height={CARD_H} fill="#151515" />
        </Layer>

        {/* Locked frame layer: eraser can never touch this */}
        <Layer listening={false}>
          <FrameArt frame={frame} L={L} color={doc.frameColor} bg={doc.bg} images={doc.images} />
        </Layer>

        {/* Doodle layer, clipped to the card */}
        <Layer>
          <Group clipX={0} clipY={0} clipWidth={CARD_W} clipHeight={CARD_H}>
            {doc.items.map(renderItem)}
            {live && (
            <Line points={live.points} stroke={live.color} strokeWidth={live.size} lineCap="round" lineJoin="round" tension={0.35}
              globalCompositeOperation={live.erase ? 'destination-out' : 'source-over'} listening={false} />
            )}
          </Group>
        </Layer>

        <Layer>
          <Transformer
            ref={trRef}
            keepRatio
            rotateEnabled
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            borderStroke="#e5484d"
            borderDash={[6, 4]}
            borderStrokeWidth={2}
            anchorStroke="#151515"
            anchorFill="#ffffff"
            anchorSize={14}
            rotateAnchorOffset={28}
            boundBoxFunc={(o, n) => (n.width < 20 || n.height < 20 ? o : n)}
          />
        </Layer>
      </Stage>

      {box && selectable && selectedId && (
        <div
          className="absolute z-10 flex gap-1"
          style={{ left: Math.max(0, box.x + box.width), top: Math.max(0, box.y), transform: 'translate(-100%, -115%)' }}
        >
          <button className="btn" style={{ minWidth: 36, minHeight: 36, padding: 0, transform: 'none' }} title="Duplicate" onClick={onDuplicate}>
            ⧉
          </button>
          <button className="btn" style={{ minWidth: 36, minHeight: 36, padding: 0, transform: 'none', background: '#ffb3b3' }} title="Delete" onClick={onDelete}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
});

export default CanvasStage;
