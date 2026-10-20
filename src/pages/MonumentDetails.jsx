import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Box, CalendarDays, MapPin, Volume2 } from "lucide-react";
import FeaturePanel from "../components/FeaturePanel.jsx";
import { getMonument } from "../data/monuments.js";

export default function MonumentDetails() {
  const { id } = useParams();
  const monument = getMonument(id);

  if (!monument) {
    return <Navigate to="/" replace />;
  }

  function readOverview() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(
      new SpeechSynthesisUtterance(`${monument.name}. ${monument.overview}`)
    );
  }

  return (
    <main className="detail-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} />
        Back to monuments
      </Link>
      <section className="detail-hero">
        <div className="detail-image">
          <img src={monument.image} alt={monument.name} />
        </div>
        <div className="detail-copy">
          <p className="section-kicker">{monument.location}</p>
          <h1>{monument.name}</h1>
          <div className="detail-meta">
            <span>
              <MapPin size={16} />
              {monument.location}
            </span>
            <span>
              <CalendarDays size={16} />
              {monument.period}
            </span>
          </div>
          <p>{monument.overview}</p>
          <p className="style-line">{monument.style}</p>
          <div className="hero-actions">
            <Link className="primary-button" to={`/monuments/${monument.id}/3d`}>
              <Box size={18} />
              Explore in 3D
            </Link>
            <button className="secondary-button" type="button" onClick={readOverview}>
              <Volume2 size={18} />
              Read Aloud
            </button>
          </div>
        </div>
      </section>

      <section className="facts-grid">
        {monument.facts.map((fact) => (
          <article key={fact}>{fact}</article>
        ))}
      </section>

      <FeaturePanel features={monument.features} />
    </main>
  );
}
