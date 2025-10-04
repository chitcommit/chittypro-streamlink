import { useEffect, useState } from "react";

export interface WhitelabelConfig {
  enabled: boolean;
  domain: string;
  name: string;
  shortName: string;
  tagline: string;
  branding: {
    hideChittyBranding: boolean;
    hidePoweredBy: boolean;
    customFooter: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    borderColor: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
    logo?: {
      url: string;
      width: string;
      height: string;
      altText: string;
    };
    favicon?: string;
  };
  features: {
    multiCamera: boolean;
    ptzControls: boolean;
    guestAccess: boolean;
    recordings: boolean;
    chat: boolean;
    analytics: boolean;
    ai: boolean;
  };
}

const defaultConfig: WhitelabelConfig = {
  enabled: false,
  domain: "localhost",
  name: "ChittyPro Streamlink",
  shortName: "ChittyPro",
  tagline: "Professional Camera Surveillance",
  branding: {
    hideChittyBranding: false,
    hidePoweredBy: false,
    customFooter: "",
  },
  theme: {
    primaryColor: "#5B8DEF",
    secondaryColor: "#3B71CA",
    accentColor: "#10B981",
    backgroundColor: "#0A0E1A",
    surfaceColor: "#1E293B",
    textColor: "#F9FAFB",
    borderColor: "#475569",
    successColor: "#10b981",
    warningColor: "#f59e0b",
    errorColor: "#dc2626",
  },
  features: {
    multiCamera: true,
    ptzControls: true,
    guestAccess: true,
    recordings: true,
    chat: true,
    analytics: true,
    ai: true,
  },
};

// Convert hex to HSL for CSS variables
function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0, 0%, 0%";

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);

  return `${h}, ${s}%, ${l}%`;
}

export function useWhitelabel() {
  const [config, setConfig] = useState<WhitelabelConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load white-label configuration
    fetch("/config/whitelabel-derail.json")
      .then((res) => res.json())
      .then((data) => {
        if (data.whitelabel) {
          const whitelabel = data.whitelabel;
          const mergedConfig: WhitelabelConfig = {
            ...defaultConfig,
            ...whitelabel,
            branding: { ...defaultConfig.branding, ...whitelabel.branding },
            theme: { ...defaultConfig.theme, ...whitelabel.theme },
            features: { ...defaultConfig.features, ...whitelabel.features },
          };
          setConfig(mergedConfig);

          // Apply theme CSS variables
          if (mergedConfig.enabled && mergedConfig.theme) {
            const root = document.documentElement;
            const theme = mergedConfig.theme;

            root.style.setProperty("--primary", hexToHsl(theme.primaryColor));
            root.style.setProperty(
              "--secondary",
              hexToHsl(theme.secondaryColor),
            );
            root.style.setProperty("--accent", hexToHsl(theme.accentColor));
            root.style.setProperty(
              "--background",
              hexToHsl(theme.backgroundColor),
            );
            root.style.setProperty("--foreground", hexToHsl(theme.textColor));
            root.style.setProperty("--border", hexToHsl(theme.borderColor));
            root.style.setProperty("--destructive", hexToHsl(theme.errorColor));
            root.style.setProperty("--warning", hexToHsl(theme.warningColor));

            // Custom variables for derail.me
            root.style.setProperty("--surface", hexToHsl(theme.surfaceColor));
            root.style.setProperty("--dark", hexToHsl(theme.primaryColor));
            root.style.setProperty("--elevated", hexToHsl(theme.borderColor));

            // Update document metadata
            if (theme.favicon) {
              const link =
                document.querySelector("link[rel*='icon']") ||
                document.createElement("link");
              (link as HTMLLinkElement).type = "image/x-icon";
              (link as HTMLLinkElement).rel = "shortcut icon";
              (link as HTMLLinkElement).href = theme.favicon;
              document.getElementsByTagName("head")[0].appendChild(link);
            }

            document.title = mergedConfig.name;
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load white-label config:", err);
        setLoading(false);
      });
  }, []);

  return { config, loading };
}
