import React, { useState, useEffect, useRef } from "react";
import { Camera, X, RefreshCw, Image as ImageIcon } from "lucide-react";

interface InvoiceCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallback: () => void;
}

export const InvoiceCameraModal: React.FC<InvoiceCameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  onFallback
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async (mode: "environment" | "user") => {
    stopStream();
    setIsInitializing(true);
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("المتصفح لا يدعم الوصول المباشر لكاميرا الفيديو.");
      setIsInitializing(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.warn("Could not start direct camera stream:", err);
      setCameraError(
        "تعذر تشغيل كاميرا الفيديو المباشرة (قد يتطلب إذناً من المتصفح). يمكنك استخدام كاميرا النظام العادية بالضغط على الزر أدناه."
      );
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `captured-invoice-${Date.now()}.jpg`, {
              type: "image/jpeg"
            });
            stopStream();
            onCapture(file);
          }
        },
        "image/jpeg",
        0.85
      );
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-800/80 border-b border-slate-700/60 z-10">
          <div className="flex items-center gap-2 text-white">
            <Camera className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black">تصوير الفاتورة المباشر</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Video Canvas */}
        <div className="relative flex-1 bg-black min-h-[320px] max-h-[65vh] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl w-fit mx-auto">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-xs text-slate-300 font-bold max-w-sm mx-auto leading-relaxed">
                {cameraError}
              </p>
              <button
                type="button"
                onClick={() => {
                  stopStream();
                  onClose();
                  onFallback();
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
              >
                📸 فتح كاميرا الجهاز الافتراضية
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Target / Document guidelines overlay */}
              <div className="absolute inset-8 pointer-events-none border-2 border-indigo-400/60 border-dashed rounded-2xl flex flex-col justify-between p-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-t-2 border-l-2 border-indigo-400"></div>
                  <div className="w-4 h-4 border-t-2 border-r-2 border-indigo-400"></div>
                </div>
                <div className="text-center">
                  <span className="bg-slate-900/80 backdrop-blur-xs text-indigo-300 text-[11px] font-bold px-3 py-1 rounded-full border border-indigo-500/30">
                    ضع الفاتورة داخل الإطار وتأكد من وضوح الإضاءة والأرقام
                  </span>
                </div>
                <div className="flex justify-between">
                  <div className="w-4 h-4 border-b-2 border-l-2 border-indigo-400"></div>
                  <div className="w-4 h-4 border-b-2 border-r-2 border-indigo-400"></div>
                </div>
              </div>

              {isInitializing && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin mx-auto" />
                    <span className="text-xs text-slate-300 font-bold">جاري تشغيل الكاميرا...</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer controls */}
        {!cameraError && (
          <div className="p-4 bg-slate-800/90 border-t border-slate-700/60 flex items-center justify-between gap-4 z-10">
            {/* Fallback to file picker / native input */}
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
                onFallback();
              }}
              className="p-3 text-slate-300 hover:text-white bg-slate-700/80 hover:bg-slate-700 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="اختيار صورة من الألبوم أو كاميرا النظام"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">ألبوم / ملف</span>
            </button>

            {/* Main Shutter Capture Button */}
            <button
              type="button"
              disabled={isInitializing}
              onClick={handleCapture}
              className="p-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-full shadow-lg shadow-indigo-600/50 transition-all cursor-pointer flex items-center justify-center border-4 border-white/20"
              title="التقاط صورة الفاتورة"
            >
              <Camera className="w-7 h-7" />
            </button>

            {/* Flip Camera Button */}
            <button
              type="button"
              onClick={handleSwitchCamera}
              className="p-3 text-slate-300 hover:text-white bg-slate-700/80 hover:bg-slate-700 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="تبديل الكاميرا (الأمامية / الخلفية)"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">قلب</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
