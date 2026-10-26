import type { ColorValue } from "react-native";
import Svg, { Circle, Line, Path, Polygon, Polyline, Rect } from "react-native-svg";

// The line icons from the "Vitals iOS v5" design, drawn as SVG so they take
// any colour and size. Each one is a small 24x24 drawing.

export type IconName = "budget" | "score" | "progress" | "me" | "import" | "form" | "split" | "pause" | "play" | "spark";

interface IconProps {
  name: IconName;
  color: ColorValue;
  size?: number;
}

export function Icon({ name, color, size = 20 }: IconProps) {
  const line = { stroke: color, strokeWidth: 2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "budget" && (
        <>
          <Rect x={1.5} y={4} width={21} height={16} rx={3} {...line} />
          <Line x1={1.5} y1={10} x2={22.5} y2={10} {...line} />
        </>
      )}
      {name === "score" && <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" {...line} />}
      {name === "progress" && (
        <>
          <Polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...line} />
          <Polyline points="17 6 23 6 23 12" {...line} />
        </>
      )}
      {name === "me" && (
        <>
          <Circle cx={12} cy={8} r={4} {...line} />
          <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" {...line} />
        </>
      )}
      {name === "import" && (
        <>
          <Path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...line} />
          <Polyline points="14 2 14 8 20 8" {...line} />
          <Line x1={12} y1={12} x2={12} y2={18} {...line} />
          <Polyline points="9 15 12 18 15 15" {...line} />
        </>
      )}
      {name === "form" && (
        <>
          <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" {...line} />
          <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" {...line} />
        </>
      )}
      {name === "split" && (
        <>
          <Line x1={16} y1={3} x2={16} y2={21} {...line} />
          <Line x1={8} y1={3} x2={8} y2={21} {...line} />
          <Line x1={3} y1={12} x2={21} y2={12} {...line} />
        </>
      )}
      {name === "pause" && (
        <>
          <Rect x={6} y={4} width={4} height={16} {...line} />
          <Rect x={14} y={4} width={4} height={16} {...line} />
        </>
      )}
      {name === "spark" && <Path d="M12 2 L13.6 10.4 L22 12 L13.6 13.6 L12 22 L10.4 13.6 L2 12 L10.4 10.4 Z" fill={color} />}
      {name === "play" && <Polygon points="5 3 19 12 5 21 5 3" {...line} />}
    </Svg>
  );
}
