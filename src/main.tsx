import React from 'react';
import ReactDOM from 'react-dom/client';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { PolylineCollection, Primitive } from 'cesium';
import './styles.css';
import App from './App';

declare global {
  interface Window {
    __cesiumDepthOverrideInstalled__?: boolean;
  }
}

function installCesiumDepthOverrides(): void {
  if (window.__cesiumDepthOverrideInstalled__) return;

  const oldPolylineUpdate = (PolylineCollection.prototype.update as (...args: any[]) => void);
  (PolylineCollection.prototype.update as unknown as (...args: any[]) => void) = function patchedPolylineUpdate(
    this: any,
    frameState: any,
  ) {
    const oldMorphTime = frameState.morphTime;
    frameState.morphTime = 0.0;
    oldPolylineUpdate.call(this, frameState);
    frameState.morphTime = oldMorphTime;
  };

  const oldPrimitiveUpdate = (Primitive.prototype.update as (...args: any[]) => void);
  (Primitive.prototype.update as unknown as (...args: any[]) => void) = function patchedPrimitiveUpdate(
    this: any,
    frameState: any,
  ) {
    const primitive = this as Primitive & {
      appearance?: {
        _renderState?: {
          depthTest?: {
            enabled?: boolean;
          };
        };
      };
    };

    if (primitive.appearance?._renderState?.depthTest) {
      primitive.appearance._renderState.depthTest.enabled = false;
    }

    oldPrimitiveUpdate.call(this, frameState);
  };

  window.__cesiumDepthOverrideInstalled__ = true;
}

installCesiumDepthOverrides();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
