'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  isReady: boolean;
  hasPermission: boolean | null;
  error: string | null;
  startCamera: (deviceIdToUse?: string) => Promise<boolean>;
  stopCamera: () => void;
  switchDevice: (newDeviceId: string) => Promise<boolean>;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('presentai_preferred_camera') || '';
    }
    return '';
  });
  const [isReady, setIsReady] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const selectedDeviceIdRef = useRef<string>(selectedDeviceId);
  selectedDeviceIdRef.current = selectedDeviceId;

  // Load list of video input devices
  const loadDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceIdRef.current) {
        const defaultId = videoInputs[0].deviceId;
        setSelectedDeviceId(defaultId);
        selectedDeviceIdRef.current = defaultId;
      }
    } catch (err) {
      console.warn('Failed to enumerate camera devices:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsReady(false);
  }, []);

  const startCamera = useCallback(async (deviceIdToUse?: string): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Webcam API is not supported in this browser.');
      setHasPermission(false);
      return false;
    }

    try {
      setError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const targetDeviceId = deviceIdToUse || selectedDeviceIdRef.current;
      const constraints: MediaStreamConstraints = {
        video: targetDeviceId
          ? { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback without exact deviceId if specific camera fails
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsReady(true);
        };
      } else {
        setIsReady(true);
      }

      await loadDevices();
      return true;
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errObj = err as Error;
      if (errObj.name === 'NotAllowedError' || errObj.name === 'PermissionDeniedError') {
        setError('Izin kamera ditolak.');
      } else if (errObj.name === 'NotFoundError' || errObj.name === 'DevicesNotFoundError') {
        setError('Kamera tidak ditemukan.');
      } else {
        setError('Gagal memulai kamera: ' + (errObj.message || 'Unknown error'));
      }
      setHasPermission(false);
      setIsReady(false);
      return false;
    }
  }, [loadDevices]);

  const switchDevice = useCallback(async (newDeviceId: string): Promise<boolean> => {
    setSelectedDeviceId(newDeviceId);
    selectedDeviceIdRef.current = newDeviceId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('presentai_preferred_camera', newDeviceId);
    }
    return startCamera(newDeviceId);
  }, [startCamera]);

  // Clean up tracks on unmount only
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    stream,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    isReady,
    hasPermission,
    error,
    startCamera,
    stopCamera,
    switchDevice,
  };
}
