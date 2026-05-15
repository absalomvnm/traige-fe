import { C } from "../../constants/theme";
import TriageLogo from "../../assets/triage-logo.svg";
import BabyFeet from "../../assets/baby-feet.svg";

export function Logo({ size = 36, white = false }: any) {
  const g = white ? "#fff" : C.green;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
      <span style={{ fontSize: size, fontWeight: 900, color: g, lineHeight: 1 }}>
        Ob
      </span>
      <span
        style={{
          fontSize: size,
          fontWeight: 900,
          color: white ? "#fca5a5" : C.p1,
          lineHeight: 1,
        }}
      >
        S
      </span>
      <span
        style={{
          fontSize: size,
          fontWeight: 900,
          color: white ? "#fcd34d" : C.p2,
          lineHeight: 1,
        }}
      >
        A
      </span>
      <span style={{ fontSize: size, fontWeight: 900, color: g, lineHeight: 1 }}>
        triage
      </span>
    </div>
  );
}

export function Footprints({ light = false, animated = false }: any) {
  const slots = [42, 105, 168];
  if (!animated) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 18,
        }}
      >
        {slots.map((_, i) => (
          <img
            key={i}
            src={BabyFeet}
            alt="Baby Feet"
            style={{ height: 68, width: "auto", opacity: light ? 0.9 : 1 }}
          />
        ))}
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: 220, height: 56, overflow: "visible" }}>
      {slots.map((leftSlot, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: leftSlot,
            top: 2,
            transform: "translateX(-50%)",
          }}
        >
          <img
            src={BabyFeet}
            alt="Baby Feet"
            className={`walk-step walk-step-${i}`}
            style={{
              height: 88,
              width: "auto",
              opacity: light ? 0.9 : 1,
              display: "block",
              animationDelay: `${i * 0.9}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}

export function Woman() {
  return (
    <div
      style={{
        width: 230,
        height: 178,
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      }}
    >
      <img
        src={TriageLogo}
        alt="Triage Logo"
        style={{
          width: 230,
          height: "auto",
          display: "block",
          transform: "translateY(-26px)",
        }}
      />
    </div>
  );
}
