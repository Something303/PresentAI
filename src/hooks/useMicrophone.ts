'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseMicrophoneReturn {
  stream: MediaStream | null;
  volume: number; // 0 to 100
  isSpeaking: boolean;
  hasPermission: boolean | null;
  error: string | null;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  startMicrophone: (deviceIdToUse?: string) => Promise<boolean>;
  stopMicrophone: () => void;
  switchDevice: (newDeviceId: string) => Promise<boolean>;
}

export function useMicrophone(): UseMicrophoneReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('presentai_preferred_mic') || '';
    }
    return '';
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const selectedDeviceIdRef = useRef<string>(selectedDeviceId);
  const lastUpdateRef = useRef<number>(0);
  const smoothedVolumeRef = useRef<number>(0);

  selectedDeviceIdRef.current = selectedDeviceId;

  const loadDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !selectedDeviceIdRef.current) {
        const defaultId = audioInputs[0].deviceId;
        setSelectedDeviceId(defaultId);
        selectedDeviceIdRef.current = defaultId;
      }
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
    }
  }, []);

  const stopMicrophone = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setVolume(0);
    setIsSpeaking(false);
  }, []);

  const startMicrophone = useCallback(async (deviceIdToUse?: string): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone API is not supported in this browser.');
      setHasPermission(false);
      return false;
    }

    try {
      setError(null);
      // Clean up any ongoing session first
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const targetDeviceId = deviceIdToUse || selectedDeviceIdRef.current;
      const constraints: MediaStreamConstraints = {
        audio: targetDeviceId
          ? { deviceId: { exact: targetDeviceId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true },
      };

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Fallback without exact deviceId if that device fails to open
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setHasPermission(true);

      // Setup Web Audio Analyser
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      // Resume context if suspended (policy requirement in modern browsers)
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.fftSize);

      const updateMeter = () => {
        if (!analyserRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') {
          return;
        }

        // Use Time Domain RMS for responsive, accurate audio volume
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const raw = Math.min(100, Math.round(rms * 280));
        
        // Exponential moving average for smooth, organic audio level response
        const smoothed = Math.round(smoothedVolumeRef.current * 0.45 + raw * 0.55);
        smoothedVolumeRef.current = smoothed;
        
        const now = performance.now();
        if (now - lastUpdateRef.current >= 60) {
          lastUpdateRef.current = now;
          setVolume(smoothed);
          setIsSpeaking(smoothed > 8);
        }

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      };

      updateMeter();
      await loadDevices();
      return true;
    } catch (err: unknown) {
      console.error('Microphone error:', err);
      const errObj = err as Error;
      if (errObj.name === 'NotAllowedError' || errObj.name === 'PermissionDeniedError') {
        setError('Izin mikrofon ditolak.');
      } else {
        setError('Mikrofon tidak tersedia: ' + (errObj.message || 'Unknown error'));
      }
      setHasPermission(false);
      return false;
    }
  }, [loadDevices]);

  const switchDevice = useCallback(async (newDeviceId: string): Promise<boolean> => {
    setSelectedDeviceId(newDeviceId);
    selectedDeviceIdRef.current = newDeviceId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('presentai_preferred_mic', newDeviceId);
    }
    return startMicrophone(newDeviceId);
  }, [startMicrophone]);

  // Clean up on unmount only
  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, [stopMicrophone]);

  return {
    stream,
    volume,
    isSpeaking,
    hasPermission,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    startMicrophone,
    stopMicrophone,
    switchDevice,
  };
}
