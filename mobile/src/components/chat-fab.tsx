import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { budgetToFormData, formatBudgetContext, streamChat } from "@vitals/shared";
import type { Message } from "@vitals/shared";
import { Sheet } from "@/components/sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useStore } from "@/lib/store";

const STARTERS = [
  "Why is my score low and what should I focus on first?",
  "Should I pay off debt or build my emergency fund first?",
  "How much emergency fund do I actually need?",
  "How can I improve my savings rate?",
];

// The four-pointed sparkle from the "Chat FAB Icons" design.
function SparkIcon() {
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Path d="M13 3 L14.4 10.6 L22 13 L14.4 15.4 L13 23 L11.6 15.4 L4 13 L11.6 10.6 Z" fill="#ffffff" />
      <Circle cx={20} cy={6} r={1.5} fill="#ffffff" opacity={0.6} />
      <Circle cx={6} cy={20} r={1} fill="#ffffff" opacity={0.4} />
    </Svg>
  );
}

// Floating chat button (bottom-right) that opens the chat sheet.
export function ChatFab() {
  const theme = useAppTheme();
  const metrics = useStore((s) => s.metrics);
  const metricScores = useStore((s) => s.metricScores);
  const overallScore = useStore((s) => s.overallScore);
  const mirror = useStore((s) => s.mirror);
  const profile = useStore((s) => s.financialProfile);
  const cards = useStore((s) => s.budgetCards);
  const log = useStore((s) => s.distributionLog);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [summary, setSummary] = useState("");
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    setError(false);

    const withQuestion: Message[] = [...messages, { role: "user", content: question }];
    setMessages(withQuestion);

    if (!metrics || !metricScores || overallScore === null || !mirror) {
      setMessages([
        ...withQuestion,
        { role: "assistant", content: "I need your numbers first. Add income on the Budget tab, then come back and ask me anything." },
      ]);
      return;
    }

    setLoading(true);
    let streamed = "";
    try {
      await streamChat(
        {
          message: question,
          history: messages,
          form_data: budgetToFormData(cards, log, profile),
          metrics,
          metric_scores: metricScores,
          overall_score: overallScore,
          mirror,
          provider: "",
          api_key: "",
          summarised_history: summary,
          budget_context: formatBudgetContext(cards, log),
        },
        (chunk) => {
          streamed += chunk;
          setAnswer(streamed);
        },
        setSummary
      );
      setMessages([...withQuestion, { role: "assistant", content: streamed }]);
      setAnswer("");
    } catch {
      setError(true);
    }
    setLoading(false);
  }

  return (
    <>
      {!open && (
        <Pressable onPress={() => setOpen(true)} style={[styles.fab, { backgroundColor: theme.brand }]}>
          <SparkIcon />
        </Pressable>
      )}

      <Sheet visible={open} onClose={() => setOpen(false)} title="✦ Ask Vitals">
        {messages.length === 0 && (
          <View style={styles.starters}>
            {STARTERS.map((question) => (
              <Pressable key={question} onPress={() => send(question)} style={[styles.starter, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <Text style={{ color: theme.text, fontSize: 13 }}>{question}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ gap: 8 }}>
          {messages.map((m, i) => (
            <View
              key={i}
              style={[m.role === "user" ? styles.userBubble : styles.botBubble, { backgroundColor: m.role === "user" ? theme.brand : theme.surface }]}
            >
              <Text style={{ color: m.role === "user" ? "#ffffff" : theme.text, fontSize: 13, lineHeight: 19 }}>{m.content}</Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.botBubble, { backgroundColor: theme.surface }]}>
              {answer ? <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>{answer}</Text> : <ActivityIndicator color={theme.brand} />}
            </View>
          )}
          {error && <Text style={{ color: "#dc3535", fontSize: 12 }}>Couldn't get an answer. Check your connection and try again.</Text>}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about your finances…"
            placeholderTextColor={theme.textMuted}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <Pressable onPress={() => send(input)} style={[styles.send, { backgroundColor: theme.brand }]}>
            <Text style={{ color: "#ffffff", fontWeight: "800" }}>↑</Text>
          </Pressable>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  fab: { position: "absolute", right: 16, bottom: 96, width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  starters: { gap: 8 },
  starter: { borderWidth: 1, borderRadius: 12, padding: 11 },
  userBubble: { alignSelf: "flex-end", maxWidth: "85%", borderRadius: 14, padding: 10 },
  botBubble: { alignSelf: "flex-start", maxWidth: "90%", borderRadius: 14, padding: 10 },
  inputRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  send: { width: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
