import { Box, Camera, Compass, LibraryBig, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import MonumentCard from "../components/MonumentCard.jsx";
import VoiceGuide from "../components/VoiceGuide.jsx";
import { monuments } from "../data/monuments.js";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="mandala" aria-hidden="true" />
        <div className="hero-copy">
          <VoiceGuide />
          <h1>
            Explore India's
            <span>Timeless Heritage</span>
          </h1>
          <div className="divider" aria-hidden="true">
            <span />
          </div>
          <p>
            MonuVista takes you on a journey through India's most magnificent
            monuments. Discover their stories, history, architecture and beauty
            like never before.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#monuments">
              <Compass size={18} />
              Explore Monuments
            </a>
            <Link className="secondary-button" to="/monuments/taj-mahal/3d">
              <Box size={18} />
              3D Experience
            </Link>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="elephant-stage">
            <img
              className="heritage-elephant-image"
              src="/heritage-elephant-clean.png"
              alt=""
            />
          </div>
        </div>
      </section>

      <section className="monuments-section" id="monuments">
        <div className="section-heading">
          <p>Our Heritage, Our Pride</p>
          <h2>Featured Monuments</h2>
          <span />
        </div>
        <div className="monument-row">
          {monuments.map((monument) => (
            <MonumentCard monument={monument} key={monument.id} />
          ))}
        </div>
      </section>

      <section className="feature-strip" id="explore">
        <article>
          <LibraryBig size={36} />
          <div>
            <h3>Rich History</h3>
            <p>Dive deep into the stories behind every monument.</p>
          </div>
        </article>
        <article>
          <Box size={36} />
          <div>
            <h3>3D Visual Tours</h3>
            <p>Experience monuments like never before in 3D.</p>
          </div>
        </article>
        <article id="stories">
          <Sparkles size={36} />
          <div>
            <h3>Curated Insights</h3>
            <p>Well researched information in simple language.</p>
          </div>
        </article>
        <article>
          <Camera size={36} />
          <div>
            <h3>Stunning Galleries</h3>
            <p>High quality images that bring India's heritage to life.</p>
          </div>
        </article>
      </section>
    </main>
  );
}
