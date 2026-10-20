import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

let sketchfabScriptPromise;

function loadSketchfabApi() {
  if (window.Sketchfab) return Promise.resolve(window.Sketchfab);
  if (!sketchfabScriptPromise) {
    sketchfabScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
      script.async = true;
      script.onload = () => window.Sketchfab ? resolve(window.Sketchfab) : reject(new Error("Sketchfab API did not load."));
      script.onerror = () => reject(new Error("Sketchfab API could not be loaded."));
      document.head.appendChild(script);
    });
  }
  return sketchfabScriptPromise;
}

export default function SketchfabViewer({ modelUrl, title, onApiReady, onApiError, onManualInteraction, onManualInteractionEnd }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!modelUrl || !iframeRef.current) return undefined;
    let active = true;
    const modelId = modelUrl.match(/\/models\/([^/]+)\/embed(?:[/?#]|$)/)?.[1];
    if (!modelId) {
      onApiError?.("This model URL cannot be controlled by the viewer API.");
      return undefined;
    }

    loadSketchfabApi().then((Sketchfab) => {
      if (!active) return;
      const client = new Sketchfab("1.12.1", iframeRef.current);
      client.init(modelId, {
        autostart: 1,
        success(api) {
          if (!active) return;
          api.addEventListener("viewerready", () => {
            if (active) onApiReady?.(api);
          });
          api.start();
        },
        error() {
          if (active) onApiError?.("The 3D viewer could not be initialized.");
        },
      });
    }).catch(() => {
      if (active) onApiError?.("The 3D viewer API could not be loaded.");
    });

    return () => { active = false; };
  }, [modelUrl, onApiReady, onApiError]);

  if (!modelUrl) {
    return (
      <div className="viewer-fallback" role="status">
        <AlertTriangle size={32} />
        <h2>3D model coming soon</h2>
        <p>
          This monument does not have a Sketchfab model connected yet. The
          surrounding explorer controls and feature panel are ready for it.
        </p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      className="sketchfab-viewer"
      title={title}
      src="about:blank"
      onPointerDown={onManualInteraction}
      onPointerUp={onManualInteractionEnd}
      onPointerCancel={onManualInteractionEnd}
      onBlur={onManualInteractionEnd}
      frameBorder="0"
      allowFullScreen
      xr-spatial-tracking="true"
      execution-while-in-view="true"
      execution-while-not-rendered="true"
      web-share="true"
      allow="autoplay; fullscreen; xr-spatial-tracking"
    />
  );
}
