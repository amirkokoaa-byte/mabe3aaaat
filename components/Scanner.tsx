import React, { useRef, useEffect, useState } from 'react';
import { Icons } from './Icons';

interface ScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('لا يمكن الوصول للكاميرا');
        console.error(err);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Simulation of scanning for the purpose of the demo
  // In a real app with proper bundler, we would use 'react-zxing' or 'html5-qrcode'
  // Here we provide a manual trigger for reliability in the generated code
  const handleSimulateScan = () => {
     // Generate a random 6 digit number or simulate a known product scan
     const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
     onScan(randomCode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-center items-center">
      <div className="absolute top-4 right-4 z-10">
        <button onClick={onClose} className="p-2 bg-white rounded-full text-black">
          <Icons.X />
        </button>
      </div>
      
      <div className="relative w-full h-3/4 bg-black overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-white text-center p-4">
            <p>{error}</p>
            <p className="text-sm text-gray-400 mt-2">تأكد من صلاحيات الكاميرا</p>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover opacity-80"
          />
        )}
        
        {/* Scanning Frame Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-48 border-2 border-green-500 rounded-lg relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 -mt-1 -ml-1"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 -mt-1 -mr-1"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 -mb-1 -ml-1"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 -mb-1 -mr-1"></div>
            
            {/* Animated scanning line */}
            <div className="absolute left-0 right-0 h-0.5 bg-green-500 animate-[scan_2s_infinite] top-0 opacity-50 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></div>
          </div>
        </div>
      </div>

      <div className="w-full p-6 bg-gray-900 flex flex-col items-center gap-4">
        <p className="text-white text-center mb-2">وجه الكاميرا نحو الباركود</p>
        
        {/* Fallback/Demo Button specifically for the generated environment */}
        <button 
          onClick={handleSimulateScan}
          className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold w-full active:scale-95 transition-transform"
        >
          محاكاة القراءة (تجريبي)
        </button>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
