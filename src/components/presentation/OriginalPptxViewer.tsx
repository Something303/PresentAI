'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface OriginalPptxViewerProps {
  fileData: string;
  currentSlide: number;
  isFullscreen?: boolean;
  zoom?: number;
}

// Native slide canvas dimensions from pptx-preview
const SLIDE_W = 760;
const SLIDE_H = 430;

export function OriginalPptxViewer({
  fileData,
  currentSlide,
  isFullscreen = false,
  zoom = 1,
}: OriginalPptxViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewerRef = useRef<{ preview: (data: ArrayBuffer) => Promise<unknown>; renderSingleSlide: (index: number) => void } | null>(null);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);

  // Compute the CSS scale needed so the 760×430 canvas fills the wrapper
  const computeScale = useCallback(() => {
    if (!wrapperRef.current) return;
    const { clientWidth, clientHeight } = wrapperRef.current;
    if (!clientWidth || !clientHeight) return;
    const scaleW = clientWidth / SLIDE_W;
    const scaleH = clientHeight / SLIDE_H;
    // Fit (contain): use the smaller ratio so the slide fully fits
    setScale(Math.min(scaleW, scaleH) * zoom);
  }, [zoom]);

  // Watch wrapper resize
  useEffect(() => {
    computeScale();
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(computeScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [computeScale]);

  // Recompute when zoom changes
  useEffect(() => {
    computeScale();
  }, [zoom, computeScale]);

  // Initialise pptx-preview once
  useEffect(() => {
    let disposed = false;

    const renderPresentation = async () => {
      if (!containerRef.current || !fileData || previewerRef.current) return;
      containerRef.current.replaceChildren();
      setError('');

      try {
        const { init } = await import('pptx-preview');
        const binary = atob(fileData);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }

        if (disposed || !containerRef.current) return;
        const previewer = init(containerRef.current, {
          width: SLIDE_W,
          height: SLIDE_H,
          mode: 'slide',
        });
        previewerRef.current = previewer;
        await previewer.preview(bytes.buffer);
        // Hide built-in navigation controls
        containerRef.current.querySelectorAll(
          '.pptx-preview-wrapper-next, .pptx-preview-wrapper-pre, .pptx-preview-wrapper-pagination'
        ).forEach((control) => {
          (control as HTMLElement).style.display = 'none';
        });
        previewer.renderSingleSlide(currentSlide - 1);
        // Recalculate scale after render
        computeScale();
      } catch (renderError) {
        console.error('PPTX preview error:', renderError);
        if (!disposed) setError('Slide asli tidak dapat ditampilkan. Silakan upload ulang file PPTX.');
      }
    };

    renderPresentation();
    return () => {
      disposed = true;
      previewerRef.current = null;
      containerRef.current?.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileData]);

  // Switch slide
  useEffect(() => {
    previewerRef.current?.renderSingleSlide(currentSlide - 1);
  }, [currentSlide]);

  return (
    // Wrapper fills all available space provided by the parent
    <div
      ref={wrapperRef}
      className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-zinc-950"
      style={{ minHeight: isFullscreen ? '0' : 260 }}
    >
      {error ? (
        <p className="py-12 text-center text-sm text-red-300">{error}</p>
      ) : (
        // Inner box is exactly SLIDE_W × SLIDE_H, scaled via CSS transform
        <div
          style={{
            width: SLIDE_W,
            height: SLIDE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            flexShrink: 0,
          }}
        >
          <div
            ref={containerRef}
            className="pptx-original-preview w-full h-full flex justify-center overflow-hidden rounded-xl"
          />
        </div>
      )}
    </div>
  );
}
