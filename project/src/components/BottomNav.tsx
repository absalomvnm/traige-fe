import { NAV_TABS } from "../constants/options";
import { C } from "../constants/theme";
import {
  IconClipboardList,
  IconHome,
  IconSiren,
  IconStethoscope,
} from "./icons";

const NAV_ICONS: Record<
  string,
  (p: any) => React.JSX.Element
> = {
  home: IconHome,
  stethoscope: IconStethoscope,
  clipboard: IconClipboardList,
  siren: IconSiren,
};

interface BottomNavProps {
  active: string;
  onNav: (screen: string) => void;
  alertCount: number;
}

export function BottomNav({
  active,
  onNav,
  alertCount,
}: BottomNavProps) {
  // existing tabs + new More tab
  const tabs = [
    ...NAV_TABS,
    {
      screen: "more",
      label: "More",
      icon: "more",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        margin: "0 auto" ,
        background: "rgba(255,255,255,.96)",
        backdropFilter: "blur(16px)",
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        zIndex: 100,
        boxShadow: "0 -8px 24px rgba(15,23,42,.08)",
      }}
    >
      {tabs.map((tab) => {
        const isActive =
          active === tab.screen ||
          (tab.screen === "more" &&
            ["about", "profile"].includes(active));

        return (
          <button
            key={tab.screen}
            onClick={() => onNav(tab.screen)}
            className="nav-tab"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              padding: "10px 0 12px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              position: "relative",
              transition: "all .18s ease",
            }}
          >
            {/* TOP ACTIVE BAR */}
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 3,
                  background: C.gradGreen,
                  borderRadius: "0 0 5px 5px",
                }}
              />
            )}

            {/* ICON */}
            <div
              style={{
                color: isActive
                  ? C.green
                  : C.textMuted,
                opacity: isActive ? 1 : 0.65,
                transition: "all .18s",
                transform: isActive
                  ? "translateY(-1px)"
                  : "translateY(0)",
              }}
            >
              {tab.icon === "more" ? (
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    alignItems: "center",
                    justifyContent: "center",
                    height: 22,
                  }}
                >
                  {[1, 2, 3].map((x) => (
                    <span
                      key={x}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: isActive
                          ? C.green
                          : C.textMuted,
                        display: "block",
                      }}
                    />
                  ))}
                </div>
              ) : (
                NAV_ICONS[tab.icon]?.({
                  size: 22,
                }) ?? tab.icon
              )}
            </div>

            {/* LABEL */}
            <div
              style={{
                fontSize: 10,
                fontWeight: isActive ? 800 : 600,
                color: isActive
                  ? C.green
                  : C.textMuted,
                letterSpacing: ".02em",
                transition: "all .18s",
              }}
            >
              {tab.label}
            </div>

            {/* ALERT BADGE */}
            {tab.screen === "alerts" &&
              alertCount > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: "calc(50% - 18px)",
                    background: C.p1grd,
                    borderRadius: 10,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 900,
                    color: "white",
                    padding: "0 4px",
                    boxShadow:
                      "0 4px 10px rgba(220,38,38,.25)",
                  }}
                >
                  {alertCount}
                </div>
              )}
          </button>
        );
      })}
    </div>
  );
}