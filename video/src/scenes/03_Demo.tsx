import React from "react";
import { AbsoluteFill, Video, staticFile, interpolate, useCurrentFrame } from "remotion";
import { COLORS, SCENES } from "../constants";

/**
 * Scene 03: Live demo (sub-scenes A → D)
 * Frame 0 here = absolute frame SCENES.DEMO_NORMAL.start
 *
 * BEFORE rendering: record demo-recording.mp4 and place it at video/public/demo-recording.mp4
 * The recording should be exactly 75 seconds (2250 frames @ 30fps).
 */
export const DemoScene: React.FC = () => {
  const frame = useCurrentFrame();

  // Overlay label timing relative to this sequence's frame 0
  const labelA_start = 0;
  const labelB_start = 600;   // 20s in: inject failure
  const labelC_start = 1200;  // 40s in: tool timeout

  const currentLabel =
    frame < labelB_start ? "Sub-scene A: Normal Deployment" :
    frame < labelC_start ? "Sub-scene B: Provider Failure → Fallback" :
                           "Sub-scene C: Tool Timeout → Guardrail";

  const labelColor =
    frame < labelB_start ? COLORS.green :
    frame < labelC_start ? COLORS.orange :
                           COLORS.red;

  const hasRecording = false; // Set to true after recording demo-recording.mp4

  return (
    <AbsoluteFill style={{ background: COLORS.bg }}>
      {hasRecording ? (
        <Video
          src={staticFile("demo-recording.mp4")}
          startFrom={0}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        /* Placeholder until recording is available */
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{
            background: COLORS.surface,
            border: `2px dashed ${COLORS.border}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
          }}>
            <p style={{ color: COLORS.orange, fontSize: 28, fontWeight: 700 }}>
              🎬 Screen recording placeholder
            </p>
            <p style={{ color: COLORS.muted, marginTop: 12, fontSize: 18 }}>
              Record demo-recording.mp4 (75 seconds) and place in video/public/
            </p>
            <p style={{ color: COLORS.muted, marginTop: 8, fontSize: 16 }}>
              Then set hasRecording = true in 03_Demo.tsx
            </p>
          </div>
        </AbsoluteFill>
      )}

      {/* Scene label overlay */}
      <div style={{
        position: "absolute",
        bottom: 32,
        left: 40,
        background: "#00000099",
        borderLeft: `4px solid ${labelColor}`,
        padding: "8px 20px",
        borderRadius: 4,
      }}>
        <span style={{ color: labelColor, fontWeight: 700, fontSize: 18 }}>
          {currentLabel}
        </span>
      </div>
    </AbsoluteFill>
  );
};
