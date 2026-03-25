import { useEffect, useRef } from 'react';
import { CesiumManager } from '../lib/cesiumManager';

interface ViewerContainerProps {
  onReady: (manager: CesiumManager) => void;
}

export default function ViewerContainer({ onReady }: ViewerContainerProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!viewerRef.current) return;

    const manager = new CesiumManager(viewerRef.current);
    onReady(manager);
  }, [onReady]);

  return <div ref={viewerRef} className="viewer" />;
}
