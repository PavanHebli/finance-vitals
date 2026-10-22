import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  // Optional colored header (the card detail sheet uses its card's color).
  header?: ReactNode;
}

// A panel that slides up from the bottom, over the current screen.
// Tapping the dark area behind it closes it.
export function Sheet({ visible, onClose, title, children, header }: SheetProps) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.panel, { backgroundColor: theme.bg }]}>
          {header ?? (
            <View>
              <View style={[styles.handle, { backgroundColor: theme.border }]} />
              <View style={styles.titleRow}>
                <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                <Pressable onPress={onClose} style={[styles.closeButton, { backgroundColor: theme.surface2 }]}>
                  <Text style={{ color: theme.textMuted, fontSize: 14 }}>✕</Text>
                </Pressable>
              </View>
            </View>
          )}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  panel: { maxHeight: "90%", borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: "800" },
  closeButton: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, paddingBottom: 32, gap: 12 },
});
