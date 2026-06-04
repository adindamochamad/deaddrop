import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

/**
 * Reveals words one-by-one with a bottom-up pop, in sync with VO.
 * wordsPerSecond should match the ElevenLabs speech rate (~2.5–3.0).
 */
export const WordPop: React.FC<{
  text: string;
  startFrame?: number;
  wordsPerSecond?: number;
  style?: React.CSSProperties;
  wordStyle?: React.CSSProperties;
}> = ({ text, startFrame = 0, wordsPerSecond = 2.8, style, wordStyle }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const fpw = 30 / wordsPerSecond; // frames per word

  return (
    <span style={{ display: "inline", ...style }}>
      {words.map((word, i) => {
        const wf = startFrame + i * fpw;
        const opacity = interpolate(frame - wf, [0, 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const y = interpolate(frame - wf, [0, 8], [10, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(frame - wf, [0, 6], [0.85, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${y}px) scale(${scale})`,
              marginRight: "0.28em",
              ...wordStyle,
            }}
          >
            {word}
          </span>
        );
      })}
    </span>
  );
};

/** Types out text character by character (terminal typewriter). */
export const Typewriter: React.FC<{
  text: string;
  startFrame?: number;
  charsPerSecond?: number;
  style?: React.CSSProperties;
  showCursor?: boolean;
}> = ({ text, startFrame = 0, charsPerSecond = 35, style, showCursor = true }) => {
  const frame = useCurrentFrame();
  const chars = Math.min(
    text.length,
    Math.floor(Math.max(0, (frame - startFrame) * charsPerSecond) / 30)
  );
  const done = chars >= text.length;
  const blink = Math.floor(frame / 7) % 2 === 0;

  return (
    <span style={style}>
      {text.slice(0, chars)}
      {showCursor && !done && (
        <span style={{ opacity: blink ? 1 : 0 }}>█</span>
      )}
    </span>
  );
};

/** Box with neon border + glow. */
export const GlowBox: React.FC<{
  color: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  intensity?: number;
}> = ({ color, children, style, intensity = 1 }) => (
  <div
    style={{
      border: `1px solid ${color}`,
      borderRadius: 8,
      boxShadow: `0 0 ${10 * intensity}px ${color}66, 0 0 ${30 * intensity}px ${color}22`,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Animated pulsing dot. */
export const PulseDot: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 10,
}) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame * 0.15), [-1, 1], [0.5, 1]);
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 ${size * pulse}px ${color}`,
        opacity: pulse,
      }}
    />
  );
};
