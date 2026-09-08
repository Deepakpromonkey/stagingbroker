import { useRef, useState, useEffect, useCallback } from "react";

import Gesture from "@mui/icons-material/Gesture";
import Replay from "@mui/icons-material/Replay";

/**
 * Signature pad drawn on a plain canvas. Deliberately dependency free — the
 * project has no signature library installed, and the previous version imported
 * `react-signature-canvas` plus a `components/Btn` alias, neither of which
 * exists here.
 *
 * Reports the drawing up as a PNG File via `onChange` so the parent can post it
 * as multipart form data, and `null` whenever the pad is cleared.
 */
export default function ESign({ onChange, disabled = false }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const hasInkRef = useRef(false);

  const [hasInk, setHasInk] = useState(false);

  // The canvas backing store has to match its displayed size or strokes land
  // away from the cursor. Re-measure on resize as well as on mount.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;

      // Preserve what has been drawn so far across the resize.
      const previous = hasInkRef.current ? canvas.toDataURL() : null;

      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;

      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";

      if (previous) {
        const image = new Image();
        image.onload = () =>
          ctx.drawImage(image, 0, 0, rect.width, rect.height);
        image.src = previous;
      }
    };

    resize();

    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, []);

  const pointFrom = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const emit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onChange) return;

    canvas.toBlob((blob) => {
      if (!blob) return;

      onChange(new File([blob], "signature.png", { type: "image/png" }));
    }, "image/png");
  }, [onChange]);

  const start = (event) => {
    if (disabled) return;

    event.preventDefault();

    drawingRef.current = true;
    lastPointRef.current = pointFrom(event);

    // A tap with no movement should still leave a mark.
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = lastPointRef.current;
    ctx.beginPath();
    ctx.arc(x, y, 1, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();

    hasInkRef.current = true;
    setHasInk(true);
  };

  const move = (event) => {
    if (!drawingRef.current) return;

    event.preventDefault();

    const ctx = canvasRef.current.getContext("2d");
    const from = lastPointRef.current;
    const to = pointFrom(event);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    lastPointRef.current = to;
  };

  const end = () => {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    lastPointRef.current = null;

    emit();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const ratio = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

    hasInkRef.current = false;
    setHasInk(false);

    onChange?.(null);
  };

  return (
    <div>
      <div
        className={`relative rounded-xl border-2 border-dashed transition-colors ${
          hasInk
            ? "border-emerald-300 bg-emerald-50/30"
            : "border-[#CBD5E1] bg-[#FAFBFD]"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <canvas
          ref={canvasRef}
          className={`block h-[180px] w-full touch-none rounded-xl ${
            disabled ? "cursor-not-allowed" : "cursor-crosshair"
          }`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />

        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <Gesture style={{ fontSize: 48 }} className="text-blue-100" />
            <span className="mt-1 text-xs font-semibold tracking-wider text-[#9CA3AF] uppercase">
              Draw your signature here
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-[#9CA3AF]">
          Use your mouse, trackpad or finger.
        </span>

        <button
          type="button"
          onClick={clear}
          disabled={!hasInk || disabled}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#4B5563] transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Replay style={{ fontSize: 14 }} />
          Clear
        </button>
      </div>
    </div>
  );
}
