import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

export default function MonumentCard({ monument }) {
  return (
    <article className="monument-card">
      <Link to={`/monuments/${monument.id}`} className="card-image-link">
        <img src={monument.image} alt={monument.name} loading="lazy" />
      </Link>
      <div className="card-body">
        <h3>{monument.name}</h3>
        <p className="location">
          <MapPin size={14} />
          {monument.location}
        </p>
        <p>{monument.description}</p>
        <Link className="text-link" to={`/monuments/${monument.id}`}>
          View & Explore
        </Link>
      </div>
    </article>
  );
}
