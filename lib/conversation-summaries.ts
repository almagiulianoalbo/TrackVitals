import { getMongoDatabase } from "@/lib/mongodb";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type ConversationSummaryDocument = {
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

type MessageForSummary = {
  id_mensaje: number;
  remitente: string | null;
  asunto: string | null;
  contenido: string | null;
  fecha_hora: string;
};

export function getConversationId(doctorId: number, patientId: number) {
  return `doctor:${doctorId}:patient:${patientId}`;
}

export async function getConversationSummary(doctorId: number, patientId: number) {
  const database = await getMongoDatabase();
  const collection = database.collection<ConversationSummaryDocument>("conversation_summaries");
  const conversationId = getConversationId(doctorId, patientId);

  await collection.createIndex({ conversationId: 1 }, { unique: true, name: "conversation_summaries_conversation" });

  return collection.findOne({ conversationId }, { projection: { _id: 0 } });
}

export async function generateConversationSummary(doctorId: number, patientId: number) {
  const messages = await getConversationMessages(doctorId, patientId);
  const now = new Date().toISOString();
  const conversationId = getConversationId(doctorId, patientId);
  const database = await getMongoDatabase();
  const collection = database.collection<ConversationSummaryDocument>("conversation_summaries");
  const existing = await collection.findOne({ conversationId }, { projection: { _id: 0, createdAt: 1 } });
  const summary = buildSummaryDocument({
    conversationId,
    doctorId: String(doctorId),
    patientId: String(patientId),
    messages,
    now,
    createdAt: existing?.createdAt ?? now
  });

  await collection.updateOne(
    { conversationId },
    { $set: summary },
    { upsert: true }
  );

  return summary;
}

async function getConversationMessages(doctorId: number, patientId: number) {
  const { data, error } = await getSupabaseAdmin()
    .from("mensajes")
    .select("id_mensaje,remitente,asunto,contenido,fecha_hora")
    .eq("id_medico", doctorId)
    .eq("id_paciente", patientId)
    .order("fecha_hora", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("No se pudieron cargar los mensajes de la conversación.");
  }

  return (data ?? []) as MessageForSummary[];
}

function buildSummaryDocument({
  conversationId,
  patientId,
  doctorId,
  messages,
  now,
  createdAt
}: {
  conversationId: string;
  patientId: string;
  doctorId: string;
  messages: MessageForSummary[];
  now: string;
  createdAt: string;
}): ConversationSummaryDocument {
  const normalizedMessages = messages
    .map((message) => ({
      ...message,
      text: normalizeText(`${message.asunto ?? ""} ${message.contenido ?? ""}`)
    }))
    .filter((message) => message.text);
  const allText = normalizedMessages.map((message) => message.text).join(" ");
  const patientMessages = normalizedMessages.filter((message) => message.remitente?.toLowerCase() === "paciente");
  const lastConcern = getLastConcern(patientMessages.at(-1) ?? normalizedMessages.at(-1));
  const mainTopics = getMainTopics(allText);
  const clinicalPriority = getClinicalPriority(allText);
  const importantPoints = getImportantPoints(normalizedMessages, mainTopics, clinicalPriority);
  const lastMessageAt = normalizedMessages.at(-1)?.fecha_hora ?? "";

  return {
    conversationId,
    patientId,
    doctorId,
    summary: getGeneralSummary(normalizedMessages.length, mainTopics, clinicalPriority),
    mainTopics,
    clinicalPriority,
    lastConcern,
    suggestedFollowUp: getSuggestedFollowUp(clinicalPriority, mainTopics),
    importantPoints,
    messageCount: normalizedMessages.length,
    lastMessageAt,
    createdAt,
    updatedAt: now
  };
}

function getGeneralSummary(messageCount: number, topics: string[], priority: ConversationSummaryDocument["clinicalPriority"]) {
  if (!messageCount) {
    return "No hay mensajes suficientes para construir un resumen clínico de la conversación.";
  }

  const topicText = topics.length ? topics.join(", ") : "seguimiento general";

  if (priority === "alta") {
    return `La conversación contiene señales clínicas de atención alta vinculadas a ${topicText}. Conviene revisar los últimos mensajes antes de responder.`;
  }

  if (priority === "media") {
    return `La conversación se centra en ${topicText}, con elementos que ameritan seguimiento y una respuesta clínica ordenada.`;
  }

  return `La conversación mantiene un seguimiento estable sobre ${topicText}, sin señales críticas detectadas por el resumen automático.`;
}

function getMainTopics(text: string) {
  const topics = [
    { label: "glucemia", patterns: ["glucemia", "glucosa", "azucar", "azúcar", "mg/dl", "mgdl", "hiperglucemia", "hipoglucemia"] },
    { label: "insulina y medicación", patterns: ["insulina", "dosis", "unidades", "medicacion", "medicación", "metformina", "glargina", "lispro"] },
    { label: "alimentación", patterns: ["comida", "carbohidratos", "dieta", "almuerzo", "cena", "desayuno", "merienda"] },
    { label: "turnos y controles", patterns: ["turno", "control", "laboratorio", "consulta", "estudio"] },
    { label: "síntomas", patterns: ["mareo", "dolor", "temblor", "sudor", "nausea", "náusea", "cansancio", "vision", "visión"] },
    { label: "adherencia", patterns: ["olvide", "olvidé", "no tome", "no tomé", "no pude", "saltee", "salteé"] }
  ];

  const found = topics.filter((topic) => topic.patterns.some((pattern) => text.includes(pattern))).map((topic) => topic.label);
  return found.length ? found.slice(0, 4) : ["seguimiento general"];
}

function getClinicalPriority(text: string): ConversationSummaryDocument["clinicalPriority"] {
  const highRiskPatterns = [
    "urgente",
    "emergencia",
    "desmayo",
    "perdi el conocimiento",
    "perdí el conocimiento",
    "dolor en el pecho",
    "cetona",
    "cetonas",
    "vomitos",
    "vómitos",
    "convulsion",
    "convulsión"
  ];
  const mediumRiskPatterns = [
    "hipoglucemia",
    "hiperglucemia",
    "mareo",
    "temblor",
    "sudor",
    "muy alta",
    "muy baja",
    "no baja",
    "no sube"
  ];
  const glucoseValues = Array.from(text.matchAll(/\b\d{2,3}\b/g)).map((match) => Number(match[0]));

  if (highRiskPatterns.some((pattern) => text.includes(pattern))) return "alta";
  if (glucoseValues.some((value) => value < 60 || value > 300)) return "alta";
  if (mediumRiskPatterns.some((pattern) => text.includes(pattern))) return "media";
  if (glucoseValues.some((value) => value < 70 || value > 180)) return "media";

  return "baja";
}

function getLastConcern(message: (MessageForSummary & { text: string }) | undefined) {
  if (!message?.contenido?.trim()) {
    return "No se detectó una preocupación reciente específica.";
  }

  return shorten(message.contenido.trim(), 180);
}

function getSuggestedFollowUp(priority: ConversationSummaryDocument["clinicalPriority"], topics: string[]) {
  if (priority === "alta") {
    return "Revisar la conversación con prioridad y responder con indicaciones claras. Si hay síntomas severos, orientar a consulta urgente.";
  }

  if (topics.includes("insulina y medicación")) {
    return "Confirmar dosis, horarios y respuesta glucémica reciente antes de ajustar indicaciones.";
  }

  if (topics.includes("alimentación")) {
    return "Pedir contexto de comidas, carbohidratos y horarios para relacionarlo con los valores de glucemia.";
  }

  if (priority === "media") {
    return "Dar seguimiento en la conversación y solicitar registros recientes para completar la lectura clínica.";
  }

  return "Mantener seguimiento habitual y reforzar la carga regular de registros.";
}

function getImportantPoints(
  messages: Array<MessageForSummary & { text: string }>,
  topics: string[],
  priority: ConversationSummaryDocument["clinicalPriority"]
) {
  const points: string[] = [];

  if (!messages.length) {
    return ["Sin mensajes clínicos para analizar todavía."];
  }

  points.push(`${messages.length} mensajes analizados en esta conversación.`);

  if (topics.length) {
    points.push(`Temas detectados: ${topics.join(", ")}.`);
  }

  if (priority === "alta") {
    points.push("El resumen detectó señales compatibles con prioridad clínica alta.");
  } else if (priority === "media") {
    points.push("Hay elementos que conviene revisar en el próximo intercambio.");
  }

  const recentPatientMessage = messages.filter((message) => message.remitente?.toLowerCase() === "paciente").at(-1);
  if (recentPatientMessage?.contenido) {
    points.push(`Último mensaje del paciente: ${shorten(recentPatientMessage.contenido, 120)}`);
  }

  return points.slice(0, 5);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function shorten(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;
}
