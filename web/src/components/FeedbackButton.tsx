import Link from "next/link";
import { MessageSquare } from "lucide-react";

export function FeedbackButton() {
  return (
    <Link
      href="/feedback"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium bg-[var(--bg)] border border-[var(--border)] text-[var(--text-muted)] shadow-md hover:text-[var(--brand)] hover:border-[var(--brand)] transition-colors"
    >
      <MessageSquare size={13} />
      Feedback
    </Link>
  );
}
