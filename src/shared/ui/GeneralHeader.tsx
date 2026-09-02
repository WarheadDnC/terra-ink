import { publicAsset } from "@/core/config";
import { InfoIcon } from "@/shared/ui/Icons";
import SocialLinkGroup from "@/shared/ui/SocialLinkGroup";

interface GeneralHeaderProps {
  onAboutOpen: () => void;
}

export default function GeneralHeader({ onAboutOpen }: GeneralHeaderProps) {
  return (
    <header className="general-header">
      <h1 className="posteroom-brand" aria-label="Posteroom Map Designer">
        <img
          className="posteroom-brand-logo"
          src={publicAsset("assets/posteroom-logo.png")}
          alt="Posteroom"
          width={160}
          height={160}
        />
      </h1>

      <div className="general-header-actions">
        <SocialLinkGroup variant="header" />
        <button
          type="button"
          className="general-header-text-btn general-header-about-text-btn"
          onClick={onAboutOpen}
          aria-label="About and licenses"
          title="About and licenses"
        >
          <span className="general-header-btn-label">About &amp; licenses</span>
          <span className="general-header-btn-icon" aria-hidden="true">
            <InfoIcon />
          </span>
        </button>
      </div>
    </header>
  );
}
