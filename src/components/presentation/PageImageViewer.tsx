'use client';

interface PageImageViewerProps {
  images: string[];
  currentSlide: number;
  isFullscreen?: boolean;
  zoom?: number;
}

// Shows a single rendered page (currently used for PDF uploads, where each page is
// rasterized at upload time) — the non-PPTX counterpart to OriginalPptxViewer, so
// non-PPTX materials also display the real page instead of reflowed bullet text.
export function PageImageViewer({ images, currentSlide, isFullscreen = false, zoom = 1 }: PageImageViewerProps) {
  const src = images[currentSlide - 1];

  return (
    <div
      className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden bg-zinc-950"
      style={{ minHeight: isFullscreen ? '0' : 260 }}
    >
      {src ? (
        <img
          src={src}
          alt={`Halaman ${currentSlide}`}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          style={{ transform: zoom !== 1 ? `scale(${zoom})` : undefined, transformOrigin: 'center center' }}
        />
      ) : (
        <p className="py-12 text-center text-sm text-zinc-400">Halaman tidak ditemukan.</p>
      )}
    </div>
  );
}
