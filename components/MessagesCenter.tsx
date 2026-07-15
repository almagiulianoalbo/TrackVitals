"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { rememberRecentPatient } from "@/lib/recent-patients";

type UserRole = "paciente" | "medico";
type FilterKey = "todos" | "no-leidos";
const MESSAGE_REFRESH_INTERVAL_MS = 1500;

type RelatedPerson = {
  nombre: string | null;
  apellido: string | null;
  email?: string | null;
};

export type MessageRow = {
  id_mensaje: number;
  id_paciente: number;
  id_medico: number;
  remitente: string | null;
  asunto: string | null;
  contenido: string | null;
  leido: boolean | null;
  fecha_hora: string;
  pacientes?: RelatedPerson | RelatedPerson[] | null;
  medicos?: RelatedPerson | RelatedPerson[] | null;
};

export type MessageContact = {
  id: number;
  name: string;
  email: string | null;
  role: "paciente" | "medico";
};

type Conversation = MessageContact & {
  messages: MessageRow[];
  unread: number;
  lastMessage: MessageRow | null;
};

type ConversationSummary = {
  conversationId: string;
  patientId: string;
  doctorId: string;
  summary: string;
  mainTopics: string[];
  clinicalPriority: "baja" | "media" | "alta";
  lastConcern: string;
  suggestedFollowUp: string;
  importantPoints: string[];
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
};

type ConversationSummaryState = {
  loading: boolean;
  generating: boolean;
  error: string | null;
  data: ConversationSummary | null;
};

const initialSummaryState: ConversationSummaryState = {
  loading: false,
  generating: false,
  error: null,
  data: null
};

export function MessagesCenter({
  contacts,
  messages,
  role
}: {
  contacts: MessageContact[];
  messages: MessageRow[];
  role: UserRole;
}) {
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [liveMessages, setLiveMessages] = useState(messages);
  const conversations = useMemo(() => buildConversations(contacts, liveMessages, role), [contacts, liveMessages, role]);
  const visibleConversations = conversations.filter((conversation) => filter === "todos" || conversation.unread > 0);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(visibleConversations[0]?.id ?? conversations[0]?.id ?? null);
  const selected = conversations.find((conversation) => conversation.id === selectedContactId) ?? visibleConversations[0] ?? conversations[0] ?? null;
  const unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
  const refreshMessages = useCallback(async () => {
    const response = await fetch("/api/dashboard/mensajes", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    });
    const data = (await response.json().catch(() => null)) as { messages?: MessageRow[] } | null;

    if (!response.ok || !Array.isArray(data?.messages)) return false;
    setLiveMessages(sortMessages(data.messages));
    return true;
  }, []);

  const upsertLiveMessage = useCallback((message: MessageRow) => {
    setLiveMessages((currentMessages) => sortMessages(upsertMessage(currentMessages, message)));
  }, []);

  useEffect(() => {
    setLiveMessages(messages);
  }, [messages]);

  useEffect(() => {
    refreshMessages().catch(() => undefined);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshMessages().catch(() => undefined);
      }
    }, MESSAGE_REFRESH_INTERVAL_MS);

    const handleFocus = () => {
      refreshMessages().catch(() => undefined);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshMessages().catch(() => undefined);
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshMessages]);

  useEffect(() => {
    if (!selected?.unread) return;

    fetch("/api/dashboard/mensajes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ contacto_id: selected.id })
    })
      .then((response) => {
        if (!response.ok) return;
        setLiveMessages((currentMessages) =>
          currentMessages.map((message) =>
            getContactId(message, role) === selected.id && !isOwnMessage(message, role)
              ? { ...message, leido: true }
              : message
          )
        );
      })
      .catch(() => undefined);
  }, [role, selected?.id, selected?.unread]);

  useEffect(() => {
    if (role === "medico" && selected?.role === "paciente") {
      rememberRecentPatient(selected.id);
    }
  }, [role, selected?.id, selected?.role]);

  return (
    <section className="messages-center">
      <div className="messages-hero">
        <div>
          <p className="eyebrow">Mensajes</p>
          <h2>Conversaciones clínicas</h2>
          <p>Un espacio simple para consultas, indicaciones y seguimiento sin ruido.</p>
        </div>
        <div className="messages-summary">
          <span><strong>{conversations.length}</strong> conversaciones</span>
          <span><strong>{unreadCount}</strong> sin leer</span>
        </div>
      </div>

      <div className="messages-layout">
        <aside className="messages-inbox">
          <div className="message-filters" aria-label="Filtrar mensajes">
            <button className={filter === "todos" ? "active" : ""} type="button" onClick={() => setFilter("todos")}>
              Todos
            </button>
            <button className={filter === "no-leidos" ? "active" : ""} type="button" onClick={() => setFilter("no-leidos")}>
              No leídos
            </button>
          </div>

          <div className="message-thread-list">
            {visibleConversations.length ? (
              visibleConversations.map((conversation) => (
                <button
                  className={`message-thread ${conversation.id === selected?.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setSelectedContactId(conversation.id)}
                  key={`${conversation.role}-${conversation.id}`}
                >
                  <span className="message-avatar" aria-hidden="true">{getInitials(conversation.name)}</span>
                  <span>
                    <strong>{conversation.name}</strong>
                    <small>{conversation.lastMessage?.contenido || conversation.email || "Sin mensajes todavía"}</small>
                  </span>
                  {conversation.unread ? <em>{conversation.unread}</em> : null}
                </button>
              ))
            ) : (
              <p className="empty-state">No hay conversaciones para este filtro.</p>
            )}
          </div>
        </aside>

        <ConversationPanel
          conversation={selected}
          role={role}
          onMessageCreated={upsertLiveMessage}
          onMessagesChanged={refreshMessages}
        />
      </div>
    </section>
  );
}

function ConversationPanel({
  conversation,
  role,
  onMessageCreated,
  onMessagesChanged
}: {
  conversation: Conversation | null;
  role: UserRole;
  onMessageCreated: (message: MessageRow) => void;
  onMessagesChanged: () => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Consulta");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryState, setSummaryState] = useState<ConversationSummaryState>(initialSummaryState);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.scrollTop = stream.scrollHeight;
  }, [conversation?.id, conversation?.messages.length]);

  useEffect(() => {
    if (!conversation || role !== "medico") {
      setSummaryState(initialSummaryState);
      setSummaryOpen(false);
      return;
    }

    let ignore = false;
    setSummaryOpen(false);
    setSummaryState({ loading: true, generating: false, error: null, data: null });

    fetch(`/api/dashboard/mensajes/resumen?contacto_id=${conversation.id}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => null)) as { error?: string; summary?: ConversationSummary | null } | null;
        if (ignore) return;

        if (!response.ok) {
          setSummaryState({ loading: false, generating: false, error: data?.error ?? "No se pudo cargar el resumen.", data: null });
          return;
        }

        setSummaryState({ loading: false, generating: false, error: null, data: data?.summary ?? null });
      })
      .catch(() => {
        if (!ignore) {
          setSummaryState({ loading: false, generating: false, error: "No se pudo conectar con el servidor.", data: null });
        }
      });

    return () => {
      ignore = true;
    };
  }, [conversation?.id, role]);

  if (!conversation) {
    return (
      <article className="conversation-panel">
        <p className="empty-state">Todavía no hay contactos disponibles para iniciar una conversación.</p>
      </article>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation || !text.trim()) return;

    setLoading(true);
    setError(null);

    const response = await fetch("/api/dashboard/mensajes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        contacto_id: conversation.id,
        categoria: category,
        contenido: text
      })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string; record?: MessageRow };

    if (!response.ok) {
      setError(data.error ?? "No se pudo enviar el mensaje.");
      setLoading(false);
      return;
    }

    setText("");
    if (data.record) {
      onMessageCreated(data.record);
    }
    await onMessagesChanged();
    setLoading(false);
  }

  async function generateSummary() {
    if (!conversation || role !== "medico") return;

    setSummaryOpen(true);
    setSummaryState((current) => ({ ...current, generating: true, error: null }));

    const response = await fetch("/api/dashboard/mensajes/resumen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ contacto_id: conversation.id })
    });
    const data = (await response.json().catch(() => null)) as { error?: string; summary?: ConversationSummary } | null;

    if (!response.ok || !data?.summary) {
      setSummaryState((current) => ({
        ...current,
        generating: false,
        error: data?.error ?? "No se pudo generar el resumen."
      }));
      return;
    }

    setSummaryState({ loading: false, generating: false, error: null, data: data.summary });
  }

  return (
    <article className="conversation-panel">
      <header className="conversation-header">
        <div className="conversation-identity">
          <div>
            <p className="eyebrow">{conversation.role === "medico" ? "Médico" : "Paciente"}</p>
            <h3>{conversation.name}</h3>
            <span>{conversation.email ?? "Contacto clínico"}</span>
          </div>
        </div>

        {role === "medico" ? (
          <ConversationSummaryLauncher
            state={summaryState}
            currentMessageCount={conversation.messages.length}
            onGenerate={generateSummary}
            onOpen={() => setSummaryOpen(true)}
          />
        ) : null}
      </header>

      {role === "medico" && summaryOpen ? (
        <ConversationSummaryModal
          state={summaryState}
          currentMessageCount={conversation.messages.length}
          onGenerate={generateSummary}
          onClose={() => setSummaryOpen(false)}
        />
      ) : null}

      <div className="message-stream" ref={streamRef}>
        {conversation.messages.length ? (
          conversation.messages.map((message, index) => {
            const own = isOwnMessage(message, role);
            const showDate = index === 0 || getDateKey(message.fecha_hora) !== getDateKey(conversation.messages[index - 1].fecha_hora);

            return (
              <div className="message-block" key={message.id_mensaje}>
                {showDate ? <span className="message-day">{formatDay(message.fecha_hora)}</span> : null}
                <div className={`message-bubble ${own ? "own" : ""}`}>
                  <span>{message.asunto || "Mensaje"}</span>
                  <p>{message.contenido}</p>
                  <small>{formatTime(message.fecha_hora)}</small>
                </div>
              </div>
            );
          })
        ) : (
          <p className="empty-state">Aún no hay mensajes. Escribí el primero para abrir la conversación.</p>
        )}
      </div>

      <form className="message-composer" onSubmit={submit}>
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categoría">
          <option>Consulta</option>
          <option>Medicación</option>
          <option>Turno</option>
          <option>Alerta</option>
        </select>
        <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder={role === "medico" ? "Escribí una indicación breve..." : "Escribí tu consulta..."} rows={3} />
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={loading || !text.trim()}>
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </article>
  );
}

function ConversationSummaryLauncher({
  state,
  currentMessageCount,
  onGenerate,
  onOpen
}: {
  state: ConversationSummaryState;
  currentMessageCount: number;
  onGenerate: () => void;
  onOpen: () => void;
}) {
  const hasNewMessages = Boolean(state.data && currentMessageCount > state.data.messageCount);

  return (
    <section className={`conversation-summary-card ${state.data ? `priority-${state.data.clinicalPriority}` : ""}`}>
      <div className="conversation-summary-heading">
        <div>
          <p className="eyebrow">Resumen clínico de conversación</p>
          <h4>{state.data ? "Lectura rápida disponible" : "Todavía no hay resumen clínico"}</h4>
          {state.loading ? <p className="conversation-summary-muted">Buscando resumen guardado...</p> : null}
          {hasNewMessages ? <p className="conversation-summary-notice">Mensajes nuevos</p> : null}
          {!state.data && !state.loading && !state.error ? (
            <p className="conversation-summary-muted">Generalo para abrirlo en modal.</p>
          ) : null}
        </div>
        <div className="conversation-summary-actions">
          {state.data ? (
            <button className="secondary-button conversation-summary-action" type="button" onClick={onOpen}>
              Ver resumen
            </button>
          ) : null}
          <button className="secondary-button conversation-summary-action" type="button" onClick={onGenerate} disabled={state.loading || state.generating}>
            {state.generating ? "Generando..." : state.data ? "Actualizar resumen" : "Generar resumen"}
          </button>
        </div>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}
    </section>
  );
}

function ConversationSummaryModal({
  state,
  currentMessageCount,
  onGenerate,
  onClose
}: {
  state: ConversationSummaryState;
  currentMessageCount: number;
  onGenerate: () => void;
  onClose: () => void;
}) {
  const hasNewMessages = Boolean(state.data && currentMessageCount > state.data.messageCount);

  return (
    <div className="conversation-summary-modal-backdrop" role="presentation">
      <section className="conversation-summary-modal" role="dialog" aria-modal="true" aria-labelledby="conversation-summary-title">
        <header className="conversation-summary-modal-header">
          <div>
            <p className="eyebrow">Resumen clínico de conversación</p>
            <h4 id="conversation-summary-title">{state.data ? "Lectura rápida del intercambio" : "Preparando lectura clínica"}</h4>
          </div>
          <button className="modal-close conversation-summary-close" type="button" onClick={onClose} aria-label="Cerrar resumen">
            ×
          </button>
        </header>

        {state.loading || state.generating ? <p className="conversation-summary-muted">Generando resumen clínico...</p> : null}
        {state.error ? <p className="form-error">{state.error}</p> : null}

        {state.data ? (
          <div className="conversation-summary-body">
            <p>{state.data.summary}</p>
            <div className="conversation-summary-meta">
              <span className={`clinical-priority priority-${state.data.clinicalPriority}`}>Prioridad {state.data.clinicalPriority}</span>
              <span>{state.data.messageCount} mensajes analizados</span>
              <span>Actualizado {formatSummaryDate(state.data.updatedAt)}</span>
            </div>
            {hasNewMessages ? <p className="conversation-summary-notice">Hay mensajes nuevos desde el último resumen.</p> : null}

            <div className="conversation-summary-grid">
              <SummaryBlock title="Temas principales" items={state.data.mainTopics} />
              <SummaryBlock title="Puntos importantes" items={state.data.importantPoints} />
            </div>

            <dl className="conversation-summary-lines">
              <div>
                <dt>Última preocupación</dt>
                <dd>{state.data.lastConcern}</dd>
              </div>
              <div>
                <dt>Sugerencia de seguimiento</dt>
                <dd>{state.data.suggestedFollowUp}</dd>
              </div>
            </dl>

            <div className="conversation-summary-modal-actions">
              <button className="secondary-button conversation-summary-action" type="button" onClick={onGenerate} disabled={state.generating}>
                {state.generating ? "Actualizando..." : "Actualizar resumen"}
              </button>
            </div>
          </div>
        ) : !state.loading && !state.generating ? (
          <div className="conversation-summary-empty">
            <p className="conversation-summary-muted">Todavía no hay resumen clínico para esta conversación.</p>
            <button className="secondary-button conversation-summary-action" type="button" onClick={onGenerate}>
              Generar resumen
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function SummaryBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="conversation-summary-block">
      <strong>{title}</strong>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function buildConversations(contacts: MessageContact[], messages: MessageRow[], role: UserRole): Conversation[] {
  return contacts
    .map((contact) => {
      const contactMessages = messages.filter((message) => getContactId(message, role) === contact.id);
      const lastMessage = contactMessages.at(-1) ?? null;
      return {
        ...contact,
        messages: contactMessages,
        lastMessage,
        unread: contactMessages.filter((message) => !isOwnMessage(message, role) && !message.leido).length
      };
    })
    .sort((left, right) => {
      const leftTime = left.lastMessage ? new Date(left.lastMessage.fecha_hora).getTime() : 0;
      const rightTime = right.lastMessage ? new Date(right.lastMessage.fecha_hora).getTime() : 0;
      return rightTime - leftTime;
    });
}

function sortMessages(messages: MessageRow[]) {
  return [...messages].sort((left, right) => new Date(left.fecha_hora).getTime() - new Date(right.fecha_hora).getTime());
}

function upsertMessage(messages: MessageRow[], message: MessageRow) {
  const index = messages.findIndex((currentMessage) => currentMessage.id_mensaje === message.id_mensaje);
  if (index === -1) return [...messages, message];

  const nextMessages = [...messages];
  nextMessages[index] = message;
  return nextMessages;
}

function getContactId(message: MessageRow, role: UserRole) {
  return role === "medico" ? Number(message.id_paciente) : Number(message.id_medico);
}

function isOwnMessage(message: MessageRow, role: UserRole) {
  return message.remitente?.toLowerCase() === role;
}

function getDateKey(value: string) {
  return value.slice(0, 10);
}

function formatDay(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function formatSummaryDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recién";
  return date.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "T").concat(parts[1]?.[0] ?? "").toUpperCase();
}
