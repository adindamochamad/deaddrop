import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";
import { FONT, TEMA } from "../theme";
import { KerangkaScene, PanelKaca, StripHero } from "../ui-kit";

const PROVIDER_ROWS = [
  { model: "claude-sonnet-4-6", status: "rate_limited", ms: 0, switch: true },
  { model: "mistral-large-3", status: "success", ms: 1120, switch: false },
  { model: "claude-sonnet-4-6", status: "error", ms: 0, switch: true },
  { model: "llama-3.1-70b", status: "success", ms: 890, switch: false },
];

const GUARD_ROWS = [
  { rule: "yaml_syntax", action: "blocked" },
  { rule: "secrets_detection", action: "mutate" },
  { rule: "prod_deploy_block", action: "blocked" },
];

export const PlatformProofScene: React.FC = () => {
  const frame = useCurrentFrame();
  const mulai = 88;

  const judulOp = interpolate(frame - mulai, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <KerangkaScene indeksBab={3}>
      <AbsoluteFill style={{ padding: "88px 90px 130px", fontFamily: FONT.sans, opacity: judulOp }}>
        <StripHero
          frameMulai={mulai}
          teks={
            <>
              <em style={{ fontStyle: "normal", color: TEMA.text, fontWeight: 600 }}>
                Not chaos theater
              </em>
              {" "}— every provider call is logged to MySQL; fallback uses the same TrueFoundry AI Gateway chain as production 429/timeouts.
            </>
          }
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
          <PanelKaca style={{ padding: 18 }}>
            <div style={{ fontSize: 10, color: TEMA.text3, letterSpacing: "0.1em", marginBottom: 12 }}>
              PROVIDER LOG · TRUEFOUNDRY AI GATEWAY
            </div>
            {PROVIDER_ROWS.map((row, i) => {
              const p = interpolate(frame - (mulai + 40 + i * 14), [0, 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              });
              const statusColor =
                row.status === "success" ? TEMA.green :
                row.status === "rate_limited" ? TEMA.orange : TEMA.red;
              return (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: `1px solid ${TEMA.border}`,
                  opacity: p,
                  fontFamily: FONT.mono,
                  fontSize: 11,
                }}>
                  <span style={{ color: TEMA.text2 }}>{row.model}</span>
                  <span>
                    {row.switch && (
                      <span style={{ color: TEMA.accent2, marginRight: 8 }}>↩ switch</span>
                    )}
                    <span style={{ color: statusColor }}>{row.status}</span>
                    {row.ms > 0 && <span style={{ color: TEMA.text3, marginLeft: 8 }}>{row.ms}ms</span>}
                  </span>
                </div>
              );
            })}
          </PanelKaca>

          <PanelKaca style={{ padding: 18 }}>
            <div style={{ fontSize: 10, color: TEMA.text3, letterSpacing: "0.1em", marginBottom: 12 }}>
              GUARDRAIL HITS · AUDIT TRAIL
            </div>
            {GUARD_ROWS.map((row, i) => {
              const p = interpolate(frame - (mulai + 50 + i * 16), [0, 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: `1px solid ${TEMA.border}`,
                  opacity: p,
                  fontSize: 12,
                }}>
                  <span style={{ color: TEMA.text }}>{row.rule.replace(/_/g, " ")}</span>
                  <span style={{
                    color: row.action === "blocked" ? TEMA.red : TEMA.orange,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    fontSize: 10,
                  }}>
                    {row.action}
                  </span>
                </div>
              );
            })}
            <p style={{
              marginTop: 14,
              fontSize: 11,
              color: TEMA.text3,
              lineHeight: 1.5,
              fontStyle: "italic",
            }}>
              Scenario buttons only inject failures early; counters reflect real gateway + guardrail code paths.
            </p>
          </PanelKaca>
        </div>

        <PanelKaca style={{
          marginTop: 16,
          padding: 14,
          border: `1px solid ${TEMA.accent}33`,
          opacity: interpolate(frame - (mulai + 90), [0, 20], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}>
          <p style={{ margin: 0, fontSize: 12, color: TEMA.text2, lineHeight: 1.55 }}>
            <strong style={{ color: TEMA.accent2 }}>Judge tip:</strong> open TrueFoundry AI Gateway routing / guardrail hits
            for 10s in your screen recording, or add <code style={{ color: TEMA.text }}>video/public/truefoundry-console.png</code> before re-render.
          </p>
        </PanelKaca>
      </AbsoluteFill>
    </KerangkaScene>
  );
};
