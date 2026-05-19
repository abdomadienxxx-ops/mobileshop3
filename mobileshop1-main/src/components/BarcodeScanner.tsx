import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const elId = 'barcode-reader-' + Date.now();
    if (containerRef.current) {
      containerRef.current.id = elId;
    }

    const scanner = new Html5Qrcode(elId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 280, height: 200 } },
      (decodedText) => {
        onScan(decodedText);
        scanner.stop().catch(() => {});
        onClose();
      },
      () => {}
    ).catch(() => {});

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-600" />
            <h3 className="text-lg font-semibold text-slate-900">Scan Barcode</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          <div ref={containerRef} className="w-full aspect-video bg-slate-100 rounded-lg overflow-hidden" />
          <p className="text-xs text-slate-400 mt-3 text-center">Point your camera at a barcode or QR code</p>
        </div>
      </div>
    </div>
  );
}
