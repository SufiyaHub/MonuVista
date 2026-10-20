import { useCallback, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, MousePointer2 } from "lucide-react";
import FeaturePanel from "../components/FeaturePanel.jsx";
import GestureController from "../components/GestureController.jsx";
import SketchfabViewer from "../components/SketchfabViewer.jsx";
import { getMonument } from "../data/monuments.js";

export default function Explorer3D() {
  const { id } = useParams();
  const [viewerApi, setViewerApi] = useState(null);
  const [viewerError, setViewerError] = useState("");
  const [manualInteractionKey, setManualInteractionKey] = useState(0);
  const [manualInteractionEndKey, setManualInteractionEndKey] = useState(0);
  const handleViewerReady = useCallback((api) => setViewerApi(api), []);
  const handleViewerError = useCallback((message) => setViewerError(message), []);
  const handleManualInteraction = useCallback(() => {
    setManualInteractionKey((key) => key + 1);
  }, []);
  const handleManualInteractionEnd = useCallback(() => {
    setManualInteractionEndKey((key) => key + 1);
  }, []);
  const monument = getMonument(id);

  if (!monument) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="explorer-page">
      <div className="explorer-topbar">
        <Link className="back-link" to={`/monuments/${monument.id}`}>
          <ArrowLeft size={16} />
          Back to details
        </Link>
        <div>
          <p className="section-kicker">3D Experience</p>
          <h1>{monument.name}</h1>
        </div>
      </div>

      <section className="explorer-layout">
        <div className="viewer-shell">
          <SketchfabViewer
            modelUrl={monument.modelUrl}
            title={`${monument.name} 3D model`}
            onApiReady={handleViewerReady}
            onApiError={handleViewerError}
            onManualInteraction={handleManualInteraction}
            onManualInteractionEnd={handleManualInteractionEnd}
          />
        </div>
        <aside className="explorer-panel">
          <div className="instruction-card">
            <MousePointer2 size={22} />
            <div>
              <h2>Explore the monument</h2>
              <p>
                Rotate, zoom, and pan inside the model frame. Hand gesture mode
                requests camera access and keeps normal mouse controls available.
              </p>
            </div>
          </div>
          <GestureController
            viewerApi={viewerApi}
            viewerError={viewerError}
            manualInteractionKey={manualInteractionKey}
            manualInteractionEndKey={manualInteractionEndKey}
          />
          <FeaturePanel features={monument.features} />
        </aside>
      </section>
    </main>
  );
}
