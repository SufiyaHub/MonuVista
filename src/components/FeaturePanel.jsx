import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";

export default function FeaturePanel({ features }) {
  const [activeName, setActiveName] = useState(features[0]?.name);
  const activeFeature = useMemo(
    () => features.find((feature) => feature.name === activeName) ?? features[0],
    [activeName, features]
  );

  function readAloud() {
    if (!activeFeature || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(`${activeFeature.name}. ${activeFeature.detail}`)
    );
  }

  return (
    <section className="feature-panel" aria-label="Key architectural features">
      <div className="section-kicker">Key Architectural Features</div>
      <div className="feature-list">
        {features.map((feature) => (
          <button
            className={feature.name === activeFeature?.name ? "active" : ""}
            key={feature.name}
            type="button"
            onClick={() => setActiveName(feature.name)}
          >
            {feature.name}
          </button>
        ))}
      </div>
      {activeFeature && (
        <div className="feature-detail">
          <div>
            <h3>{activeFeature.name}</h3>
            <p>{activeFeature.detail}</p>
          </div>
          <button className="icon-button" type="button" onClick={readAloud} aria-label="Read aloud">
            <Volume2 size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
