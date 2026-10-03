"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MAX_MESSAGE_LENGTH, type ChatMessage } from "@/lib/life/api";
import { getLifeClient, threadOf } from "@/lib/life/client";
import { GREETINGS } from "@/lib/life/friendship";
import { maskRudeWords } from "@/lib/moderation";
import { cn } from "@/lib/utils";
import { useLifeStore } from "@/store/lifeStore";
import { LookAvatar } from "./LookPreview";

const SCHOOL = "school";

function timeLabel(at: number): string {
  const d = new Date(at);
  const today = new Date();
  const hm = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === today.toDateString() ? hm : `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${hm}`;
}

/** Unread messages per conversation. */
export function useUnread(): { total: number; byThread: Record<string, number> } {
  const messages = useLifeStore((s) => s.messages);
  const chatRead = useLifeStore((s) => s.chatRead);
  const muted = useLifeStore((s) => s.muted);
  const me = useLifeStore((s) => s.me?.id ?? "");
  return useMemo(() => {
    const byThread: Record<string, number> = {};
    let total = 0;
    for (const m of messages) {
      if (m.from === me || muted.includes(m.from)) continue;
      const t = threadOf(m, me);
      if (m.id > (chatRead[t] ?? 0)) {
        byThread[t] = (byThread[t] ?? 0) + 1;
        total += 1;
      }
    }
    return { total, byThread };
  }, [messages, chatRead, muted, me]);
}

function ThreadList({ onOpen }: { onOpen: (thread: string) => void }) {
  const roster = useLifeStore((s) => s.roster);
  const messages = useLifeStore((s) => s.messages);
  const muted = useLifeStore((s) => s.muted);
  const me = useLifeStore((s) => s.me?.id ?? "");
  const { byThread } = useUnread();
  const lastIn = (thread: string) => [...messages].reverse().find((m) => threadOf(m, me) === thread);

  const people = [...roster].sort((a, b) => (lastIn(b.id)?.at ?? 0) - (lastIn(a.id)?.at ?? 0) || Number(b.online) - Number(a.online));
  const schoolLast = lastIn(SCHOOL);

  const row = (key: string, avatar: React.ReactNode, title: string, preview: string, unread: number, online?: boolean) => (
    <li key={key}>
      <button
        type="button"
        onClick={() => onOpen(key)}
        className="flex w-full items-center gap-3 rounded-2xl bg-ink/5 p-2.5 text-left active:bg-sun/30"
      >
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold text-ink">
            {online !== undefined && (
              <span className={cn("mr-1.5 inline-block h-2.5 w-2.5 rounded-full", online ? "bg-leaf" : "bg-ink/25")} aria-hidden />
            )}
            {title}
          </p>
          <p className="truncate text-sm text-ink/60">{preview}</p>
        </div>
        {unread > 0 && (
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-danger px-2 text-sm font-black text-white" aria-label={`${unread} unread`}>
            {unread}
          </span>
        )}
      </button>
    </li>
  );

  return (
    <ul className="flex flex-col gap-2">
      {row(
        SCHOOL,
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-2xl" aria-hidden>
          🏫
        </span>,
        "Everyone at school",
        schoolLast ? `${schoolLast.from === me ? "You" : schoolLast.fromName}: ${maskRudeWords(schoolLast.body)}` : "Say hello to the whole school",
        byThread[SCHOOL] ?? 0,
      )}
      {people.map((p) => {
        const last = lastIn(p.id);
        return row(
          p.id,
          <LookAvatar look={p.look} size={44} />,
          `${p.name}${muted.includes(p.id) ? " 🔇" : ""}`,
          last ? `${last.from === me ? "You: " : ""}${maskRudeWords(last.body)}` : "Send a private message",
          byThread[p.id] ?? 0,
          p.online,
        );
      })}
      {people.length === 0 && <p className="px-1 text-sm text-ink/60">Classmates appear here once they join your school.</p>}
    </ul>
  );
}

function Bubble({ m, mine, showName }: { m: ChatMessage; mine: boolean; showName: boolean }) {
  return (
    <li className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {showName && !mine && <span className="mb-0.5 px-2 text-xs font-bold text-brand">{m.fromName}</span>}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 text-base break-words whitespace-pre-wrap",
          mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-ink/5 text-ink",
        )}
      >
        {mine ? m.body : maskRudeWords(m.body)}
      </div>
      <span className="mt-0.5 px-2 text-[11px] text-ink/45">{timeLabel(m.at)}</span>
    </li>
  );
}

function Conversation({ thread, onBack }: { thread: string; onBack: () => void }) {
  const me = useLifeStore((s) => s.me?.id ?? "");
  const messages = useLifeStore((s) => s.messages);
  const muted = useLifeStore((s) => s.muted);
  const person = useLifeStore((s) => s.roster.find((r) => r.id === thread));
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const client = getLifeClient();

  const shown = messages.filter((m) => threadOf(m, me) === thread && !(m.from !== me && muted.includes(m.from)));
  const isSchool = thread === SCHOOL;

  useEffect(() => {
    client?.openThread(thread);
    return () => client?.openThread(null);
  }, [client, thread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    client?.markRead(thread);
  }, [shown.length, client, thread]);

  async function send(body: string) {
    if (!body.trim() || sending || !client) return;
    setSending(true);
    const ok = await client.sendChat(isSchool ? null : thread, body);
    setSending(false);
    if (ok) setText("");
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(text);
  }

  const left = MAX_MESSAGE_LENGTH - text.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="min-h-10 rounded-xl bg-ink/5 px-3 text-sm font-bold text-brand">
          ← Chats
        </button>
        <p className="min-w-0 flex-1 truncate text-lg font-black text-ink">{isSchool ? "🏫 Everyone at school" : person?.name ?? "Classmate"}</p>
        {!isSchool && (
          <button
            type="button"
            onClick={() => client?.toggleMute(thread)}
            aria-pressed={muted.includes(thread)}
            className="min-h-10 rounded-xl bg-ink/5 px-3 text-sm font-bold text-ink/70"
          >
            {muted.includes(thread) ? "🔇 Muted" : "Mute"}
          </button>
        )}
      </div>
      {!isSchool && muted.includes(thread) && (
        <p className="rounded-xl bg-sun/30 px-3 py-2 text-sm text-ink/80">You won&apos;t see messages from {person?.name ?? "them"} until you unmute.</p>
      )}

      <div className="max-h-[38vh] min-h-32 overflow-y-auto rounded-2xl border-2 border-ink/5 p-2">
        {shown.length === 0 ? (
          <p className="p-4 text-center text-sm text-ink/60">
            {isSchool ? "No messages yet. Everyone in your school will see what you write here." : "Start a private chat. Only the two of you can see it."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {shown.map((m, i) => (
              <Bubble key={`${m.from}:${m.id}`} m={m} mine={m.from === me} showName={isSchool && (i === 0 || shown[i - 1].from !== m.from)} />
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {GREETINGS.map((g) => (
          <button
            key={g}
            type="button"
            disabled={sending}
            onClick={() => void send(g)}
            className="min-h-9 shrink-0 rounded-full bg-sky px-3 text-sm font-bold text-brand active:scale-95 disabled:opacity-50"
          >
            {g}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2">
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
          placeholder={isSchool ? "Message everyone…" : `Message ${person?.name ?? ""}…`}
          className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl border-2 border-ink/15 bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="min-h-12 shrink-0 rounded-2xl bg-brand px-4 text-base font-black text-white shadow-[0_3px_0_0_var(--color-brand-dark)] disabled:opacity-40"
        >
          Send
        </button>
      </form>
      {left < 50 && <p className="text-right text-xs text-ink/50">{left} characters left</p>}
    </div>
  );
}

/** The message box: whole-school chat and private conversations. */
export function ChatSheet({ initialThread }: { initialThread?: string }) {
  const [thread, setThread] = useState<string | null>(initialThread ?? null);
  return thread ? <Conversation thread={thread} onBack={() => setThread(null)} /> : <ThreadList onOpen={setThread} />;
}
