import { InfoIcon } from "@/shared/ui/Icons";
import { APP_NAME, APP_TAGLINE } from "@/core/config";
import SocialLinkGroup from "@/shared/ui/SocialLinkGroup";

interface GeneralHeaderProps {
  onAboutOpen: () => void;
}

export default function GeneralHeader({ onAboutOpen }: GeneralHeaderProps) {
  return (
    <header className="general-header">
      <div className="desktop-brand">
        <img
          className="desktop-brand-logo brand-logo"
          src="/assets/logo.svg"
          alt=""
        />
        <div className="desktop-brand-copy brand-copy">
          <h1 className="desktop-brand-title">{APP_NAME}</h1>
          <p className="desktop-brand-kicker app-kicker">
            {APP_TAGLINE}
          </p>
        </div>
      </div>

      <div className="general-header-actions">
        <SocialLinkGroup variant="header" />
        <button
          type="button"
          className="general-header-text-btn general-header-about-text-btn"
          onClick={onAboutOpen}
          aria-label="About"
          title="About"
        >
          <span className="general-header-btn-label">About</span>
          <span className="general-header-btn-icon" aria-hidden="true">
            <InfoIcon />
          </span>
        </button>
      </div>
    </header>
  );
}
