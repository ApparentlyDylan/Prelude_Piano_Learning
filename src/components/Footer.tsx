import { Link } from "react-router-dom";
import "./footer.css";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <div className="site-footer__brand">Prelude</div>
          <p className="site-footer__tag">
            A complete piano education — curriculum, sheet music, and a practice
            companion that listens.
          </p>
        </div>
        <div className="site-footer__cols">
          <div>
            <div className="site-footer__head">Learn</div>
            <Link to="/learn">Curriculum</Link>
            <Link to="/read">Reading music</Link>
          </div>
          <div>
            <div className="site-footer__head">Play</div>
            <Link to="/pieces">Piece library</Link>
            <Link to="/goals">Goals & streaks</Link>
          </div>
        </div>
      </div>
      <div className="container site-footer__legal">
        <span>All pieces are public-domain works, newly arranged for Prelude.</span>
        <span>Made with patience and a metronome.</span>
      </div>
    </footer>
  );
}
