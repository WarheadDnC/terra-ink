import {
  APP_NAME,
  APP_VERSION,
  POSTEROOM_URL,
  REPO_URL,
  UPSTREAM_REPO_URL,
} from "@/core/config";
import { GitHubIcon } from "./Icons";

export default function InfoPanel() {
  return (
    <aside className="info-panel">
      <div className="info-panel-group">
        <section className="info-panel-section">
          <h3>About {APP_NAME}</h3>
          <p>
            A map poster designer by{" "}
            <a className="source-link" href={POSTEROOM_URL} target="_blank" rel="noreferrer">
              Posteroom
            </a>
            . Choose a place, style your map and make it your own.
          </p>
          <p>Version {APP_VERSION}</p>
        </section>
        <section className="info-panel-section">
          <h3>Open source</h3>
          <p>
            Based on{" "}
            <a className="source-link" href={UPSTREAM_REPO_URL} target="_blank" rel="noreferrer">
              Terraink source code
            </a>
            . This is an independent Posteroom adaptation, with no affiliation
            with or endorsement by the original project.
          </p>
          <p>
            Original software copyright © 2026 Yousuf Amanuel. Licensed under
            the GNU Affero General Public License. This program comes without
            any warranty. Original copyright and license notices are retained
            in the source repository.
          </p>
          <div className="footer-links">
            <a className="github-badge" href={REPO_URL} target="_blank" rel="noreferrer">
              <GitHubIcon className="badge-icon" /> Source code
            </a>
            <a className="footer-link" href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              License notices
            </a>
          </div>
        </section>
        <section className="info-panel-section">
          <h3>Map credits</h3>
          <p>
            Map data ©{" "}
            <a className="source-link" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
              OpenStreetMap contributors
            </a>
            . Tiles ©{" "}
            <a className="source-link" href="https://openmaptiles.org/" target="_blank" rel="noreferrer">
              OpenMapTiles
            </a>
            . Powered by{" "}
            <a className="source-link" href="https://openfreemap.org/" target="_blank" rel="noreferrer">OpenFreeMap</a>
            ,{" "}
            <a className="source-link" href="https://nominatim.openstreetmap.org/" target="_blank" rel="noreferrer">Nominatim</a>
            {" and "}
            <a className="source-link" href="https://maplibre.org/" target="_blank" rel="noreferrer">MapLibre</a>.
          </p>
        </section>
      </div>
    </aside>
  );
}
