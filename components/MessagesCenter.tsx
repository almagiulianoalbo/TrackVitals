"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type UserRole = "paciente" | "medico";
type FilterKey = "todos" | "no-leidos";

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

export function MessagesCenter({
  contacts,
  messages,
  role,
  userId
}: {
  contacts: MessageContact[];
  messages: MessageRow[];
  role: UserRole;
  userId: number;
}) {
  const [filter, setFilter] = useState<FilterKey>("todos");
  const conversations = useMemo(() => buildConversations(contacts, messages, role), [contacts, messages, role]);
  const visibleConversations = conversations.filter((conversation) => filter === "todos" || conversation.unread > 0);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(visibleConversations[0]?.id ?? conversations[0]?.id ?? null);
  const selected = conversations.find((conversation) => conversation.id === selectedContactId) ?? visibleConversations[0] ?? conversations[0] ?? null;
  const unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unread, 0);

  useEffect(() => {
    if (!selected?.unread) return;

    fetch("/api/dashboard/mensajes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacto_id: selected.id })
    }).catch(() => undefined);
  }, [selected?.id, selected?.unread]);

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

        <ConversationPanel conversation={selected} role={role} userId={userId} />
      </div>
    </section>
  );
}

function ConversationPanel({ conversation, role, userId }: { conversation: Conversation | null; role: UserRole; userId: number }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Consulta");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const stream = streamRef.current;
    if (!stream) return;
    stream.scrollTop = stream.scrollHeight;
  }, [conversation?.id, conversation?.messages.length]);

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
      body: JSON.stringify({
        contacto_id: conversation.id,
        categoria: category,
        contenido: text
      })
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "No se pudo enviar el mensaje.");
      setLoading(false);
      return;
    }

    setText("");
    setLoading(false);
    router.refresh();
  }

  return (
    <article className="conversation-panel">
      <header className="conversation-header">
        <span className="message-avatar large" aria-hidden="true">{getInitials(conversation.name)}</span>
        <div>
          <p className="eyebrow">{conversation.role === "medico" ? "Médico" : "Paciente"}</p>
          <h3>{conversation.name}</h3>
          <span>{conversation.email ?? "Contacto clínico"}</span>
        </div>
      </header>

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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "T").concat(parts[1]?.[0] ?? "").toUpperCase();
}
