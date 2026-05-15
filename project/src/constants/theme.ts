export const C = {
  bg: "#FFFFFF",
  bgSoft: "#F6F8F7",
  bgDeep: "#EEF3F0",
  border: "#E2EBE6",
  borderMid: "#C8D8CF",
  green: "#1E7B47",
  greenL: "#D1FAE5",
  greenD: "#155F38",
  greenM: "#2A9D5C",
  purple: "#7C3AED",
  purpleL: "#EDE9FE",
  purpleM: "#8B5CF6",
  teal: "#0D9488",
  tealL: "#CCFBF1",
  sky: "#0284C7",
  skyL: "#E0F2FE",
  text: "#0F172A",
  textMid: "#334155",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  p1: "#DC2626",
  p1bg: "#FFF1F2",
  p1b: "#FECDD3",
  p1grd: "linear-gradient(135deg,#ef4444,#dc2626)",
  p2: "#D8D365",
  p2bg: "#FAFAE8",
  p2b: "#E8E48E",
  p2grd: "linear-gradient(135deg,#D8D365,#A8A350)",
  p3: "#C8C480",
  p3bg: "#FBFAEE",
  p3b: "#E8E48E",
  p3grd: "linear-gradient(135deg,#D8D365,#A8A350)",
  p4: "#059669",
  p4bg: "#ECFDF5",
  p4b: "#A7F3D0",
  p4grd: "linear-gradient(135deg,#10b981,#059669)",
  gradGreen: "linear-gradient(135deg,#1E7B47 0%,#0D6B3B 50%,#1B5E3B 100%)",
  gradTeal: "linear-gradient(135deg,#0D9488 0%,#0F766E 100%)",
  gradPurple: "linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%)",
  gradAlert: "linear-gradient(135deg,#DC2626 0%,#B91C1C 100%)",
  gradDark: "linear-gradient(160deg,#0F172A 0%,#1E293B 50%,#0F2027 100%)",

  // Custom orange for chips
  orange: "#EA580C",
  orangeL: "#FFF7ED",
};

export const pC = (p: number) => [null, C.p1, C.p2, C.p3, C.p4][p] as string;
export const pBg = (p: number) => [null, C.p1bg, C.p2bg, C.p3bg, C.p4bg][p] as string;
export const pGrd = (p: number) =>
  [null, C.p1grd, C.p2grd, C.p3grd, C.p4grd][p] as string;
export const pLbl = (p: number) =>
  [null, "EMERGENCY", "VERY URGENT", "URGENT", "NON-URGENT"][p];
export const pTm = (p: number) =>
  [null, "Immediate", "≤ 10 minutes", "≤ 30 minutes", "≤ 1 hour"][p];
