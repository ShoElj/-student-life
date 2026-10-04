/**
 * The picture shown when a link to the game is shared (WhatsApp, X, Facebook, Instagram bio…).
 * Drawn with plain shapes and text so it renders without downloading anything.
 */
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const SITE_URL = "https://school-breaktime-battle.vercel.app";

const NAVY = "#1e3a8a";
const SUN = "#facc15";

/** A little cartoon student: head, body and legs. */
function Student({ skin, shirt, x }: { skin: string; shirt: string; x: number }) {
  return (
    <div style={{ position: "absolute", left: x, bottom: 70, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: 86, height: 86, borderRadius: 43, background: skin, border: `6px solid ${NAVY}`, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
        {/* Hair, eyes and a smile. */}
        <div style={{ position: "absolute", top: -14, width: 84, height: 34, borderRadius: 30, background: "#1f1309" }} />
        <div style={{ display: "flex", gap: 18, marginTop: 30 }}>
          <div style={{ width: 10, height: 12, borderRadius: 6, background: NAVY }} />
          <div style={{ width: 10, height: 12, borderRadius: 6, background: NAVY }} />
        </div>
        <div style={{ width: 30, height: 14, marginTop: 6, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, background: "#7f1d1d" }} />
      </div>
      <div style={{ width: 104, height: 110, marginTop: -6, borderRadius: 28, background: shirt, border: `6px solid ${NAVY}` }} />
      <div style={{ display: "flex", gap: 14, marginTop: -4 }}>
        <div style={{ width: 28, height: 48, borderRadius: 10, background: NAVY }} />
        <div style={{ width: 28, height: 48, borderRadius: 10, background: NAVY }} />
      </div>
    </div>
  );
}

export function ogImage({ title, tagline, chips }: { title: string; tagline: string; chips: string[] }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #38bdf8 100%)", fontFamily: "Geist" }}>
        {/* Grass along the bottom, with the school building on it. */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90, background: "#4ade80" }} />
        <div style={{ position: "absolute", right: 60, bottom: 90, width: 400, height: 230, background: "#fde68a", border: `8px solid ${NAVY}`, borderRadius: 18, display: "flex", flexWrap: "wrap", gap: 22, padding: 30 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ width: 92, height: 62, background: "#bae6fd", border: `6px solid ${NAVY}`, borderRadius: 10 }} />
          ))}
        </div>
        <div style={{ position: "absolute", right: 210, bottom: 320, width: 100, height: 60, background: "#dc2626", border: `8px solid ${NAVY}`, borderRadius: 12 }} />
        <Student skin="#8d5524" shirt="#16a34a" x={610} />
        <Student skin="#c68642" shirt={SUN} x={730} />

        <div style={{ display: "flex", flexDirection: "column", padding: "64px 70px", width: 720 }}>
          <div style={{ fontSize: title.length > 14 ? 66 : 88, color: SUN, lineHeight: 1.05, letterSpacing: -2 }}>{title}</div>
          <div style={{ fontSize: 38, color: "white", marginTop: 22, lineHeight: 1.25 }}>{tagline}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 34, width: 560 }}>
            {chips.map((c) => (
              <div key={c} style={{ fontSize: 26, color: NAVY, background: "white", borderRadius: 40, padding: "10px 22px" }}>
                {c}
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", left: 70, bottom: 26, fontSize: 28, color: NAVY }}>Free · plays in the browser · school-breaktime-battle.vercel.app</div>
      </div>
    ),
    OG_SIZE,
  );
}
