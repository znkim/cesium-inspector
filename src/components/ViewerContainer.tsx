import { useEffect, useRef } from 'react';
import { CesiumManager } from '../lib/cesiumManager';

interface ViewerContainerProps {
  onReady: (manager: CesiumManager | null) => void;
}

export default function ViewerContainer({ onReady }: ViewerContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const managerRef = useRef<CesiumManager | null>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!containerRef.current || managerRef.current) return;

    const manager = new CesiumManager(containerRef.current);
    managerRef.current = manager;
    onReadyRef.current(manager);

    return () => {
      managerRef.current?.destroy();
      managerRef.current = null;
      onReadyRef.current(null);
    };
  }, []);

  return <div ref={containerRef} className="viewer" />;
}
