import { APP_NAME, REPO_URL, SOCIAL_INSTAGRAM } from "@/core/config";
import { GitHubIcon, InstagramIcon } from "@/shared/ui/Icons";

interface SocialLinkGroupProps {
  variant: "header" | "mobile-export";
}

export default function SocialLinkGroup({ variant }: SocialLinkGroupProps) {
  const instagramUrl = String(SOCIAL_INSTAGRAM ?? "").trim();
  const rootClassName =
    variant === "header" ? "desktop-header-social" : "mobile-export-social-links";

  return (
    <div className={rootClassName} aria-label="Project links">
      <a
        className="general-header-social-btn source-code-link"
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={`View ${APP_NAME} source code on GitHub`}
        title="Source code"
      >
        <GitHubIcon />
        <span>Source</span>
      </a>
      {instagramUrl ? (
        <a
          className="general-header-social-btn"
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Follow Posteroom on Instagram"
          title="Instagram"
        >
          <InstagramIcon />
        </a>
      ) : null}
    </div>
  );
}
