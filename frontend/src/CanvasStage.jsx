import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Text, Image as KImage, Transformer, Group } from 'react-konva';
import { CARD_H, CARD_W, PHOTOS, uid, useImage } from './utils.js';

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

const CanvasStage = forwardRef(function CanvasStage(
  {
    doc,
    tool,
    penColor,
    penSize,
    eraserSize,
    zoom,
    selectedId,
    setSelectedId,
    commit,
    onStrokeEnd,
    onDuplicate,
    onDelete,
  },
  ref
) {
  const stageRef = useRef(null);
  const trRef = useRef(null);
  const drawing = useRef(false);
  const liveRef = useRef(null);
  const [live, setLive] = useState(null);
  const [box, setBox] = useState(null);
  const [fontTick, setFontTick] = useState(0);

  // redraw once web fonts are loaded so canvas text uses them
  useEffect(() => {
    document.fonts?.ready.then(() => setFontTick((t) => t + 1));
  }, []);

  useImperativeHandle(ref, () => ({
    toDataURL() {
      const tr = trRef.current;
      tr?.hide();
      const url = stageRef.current.toDataURL({ pixelRatio: 2 / zoom, mimeType: 'image/png' });
      tr?.show();
      return url;
    },
  }));

  const selectable = tool === 'select';

  // attach transformer to the selected node
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
  }, [selectedId, selectable, doc.items, zoom, updateBox, fontTick]);

  // ---- drawing ----
  const pos = () => stageRef.current.getRelativePointerPosition();

  const handleDown = (e) => {
    if (tool === 'select') {
      if (e.target === e.target.getStage()) setSelectedId(null);
      return;
    }
    const p = pos();
    if (!p) return;
    drawing.current = true;
    setSelectedId(null);
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

  const handleMove = () => {
    if (!drawing.current || !liveRef.current) return;
    const p = pos();
    if (!p) return;
    liveRef.current = { ...liveRef.current, points: [...liveRef.current.points, p.x, p.y] };
    setLive(liveRef.current);
  };

  useEffect(() => {
    const end = () => {
      if (!drawing.current) return;
      drawing.current = false;
      const s = liveRef.current;
      liveRef.current = null;
      setLive(null);
      if (s) onStrokeEnd(s);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [onStrokeEnd]);

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
      className={`relative ${tool !== 'select' ? 'touch-none-canvas' : ''}`}
      style={{ width: CARD_W * zoom, height: CARD_H * zoom, cursor: tool === 'select' ? 'default' : 'crosshair' }}
    >
      <Stage
        ref={stageRef}
        width={CARD_W * zoom}
        height={CARD_H * zoom}
        scaleX={zoom}
        scaleY={zoom}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
      >
        {/* Locked frame layer: eraser can never touch this */}
        <Layer listening={false}>
          <Rect width={CARD_W} height={CARD_H} fill={doc.frameColor} />
          {PHOTOS.map((r, i) => (
            <PhotoSlot key={i} rect={r} src={doc.images[i]} bg={doc.bg} />
          ))}
          <Text
            x={0}
            y={CARD_H - 100}
            width={CARD_W}
            align="center"
            text="Editique"
            fontFamily="Libre Baskerville"
            fontSize={30}
            fill="#1b1b8f"
          />
        </Layer>

        {/* Doodle layer: strokes, stickers and text live here, above the frame */}
        <Layer>
          {doc.items.map(renderItem)}
          {live && (
            <Line
              points={live.points}
              stroke={live.color}
              strokeWidth={live.size}
              lineCap="round"
              lineJoin="round"
              tension={0.35}
              globalCompositeOperation={live.erase ? 'destination-out' : 'source-over'}
              listening={false}
            />
          )}
          <Transformer
            ref={trRef}
            keepRatio
            rotateEnabled
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            borderStroke="#e5484d"
            borderDash={[6, 4]}
            borderStrokeWidth={2}
            anchorStroke="#2b2b2b"
            anchorFill="#fffdf5"
            anchorSize={12}
            rotateAnchorOffset={28}
            boundBoxFunc={(o, n) => (n.width < 20 || n.height < 20 ? o : n)}
          />
        </Layer>
      </Stage>

      {/* floating delete / duplicate buttons on the selected item's outline box */}
      {box && selectable && selectedId && (
        <div
          className="absolute z-10 flex gap-1"
          style={{
            left: Math.max(0, box.x + box.width),
            top: Math.max(0, box.y),
            transform: 'translate(-100%, -115%)',
          }}
        >
          <button
            className="btn"
            style={{ minWidth: 36, minHeight: 36, padding: 0, transform: 'none' }}
            title="Duplicate"
            onClick={onDuplicate}
          >
            ⧉
          </button>
          <button
            className="btn"
            style={{ minWidth: 36, minHeight: 36, padding: 0, transform: 'none', background: '#ffb3b3' }}
            title="Delete"
            onClick={onDelete}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
});

export default CanvasStage;
