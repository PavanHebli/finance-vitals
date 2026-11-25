import { Text, type StyleProp, type TextStyle } from "react-native";

// The AI writes a little Markdown: **bold**, "- " bullets and "## " headings.
// A plain <Text> shows the stars as they are, so this draws just those three.
// Example: "**Savings rate** is 12%" -> "Savings rate" in bold, then " is 12%".
export function RichText({ text, style, boldColor }: { text: string; style?: StyleProp<TextStyle>; boldColor?: string }) {
  const lines = text.split("\n");
  return (
    <Text style={style}>
      {lines.map((line, i) => {
        // "- item" or "* item" becomes "• item"; "## Heading" loses the hashes.
        let body = line.replace(/^\s*[-*] /, "• ");
        body = body.replace(/^#+\s*/, "");
        // Splitting on **...** leaves the bold parts at the odd positions.
        const parts = body.split(/\*\*(.+?)\*\*/g);
        return (
          <Text key={i}>
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <Text key={j} style={{ fontWeight: "700", color: boldColor }}>
                  {part}
                </Text>
              ) : (
                part
              )
            )}
            {i < lines.length - 1 ? "\n" : ""}
          </Text>
        );
      })}
    </Text>
  );
}

// The same text with the Markdown marks removed, for short previews.
export function plainText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*] /gm, "• ");
}
