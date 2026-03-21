// ─── Contact ────────────────────────────────────────────

export interface Contact {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: TagOnContact[];
  notes?: Note[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TagOnContact {
  contactId: string;
  tagId: string;
  tag: Tag;
}

export interface Note {
  id: string;
  contactId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Pipeline & Opportunities ───────────────────────────

export interface Pipeline {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  stages?: Stage[];
}

export interface Stage {
  id: string;
  pipelineId: string;
  name: string;
  position: number;
  color: string;
  opportunities?: Opportunity[];
}

export interface Opportunity {
  id: string;
  userId: string;
  contactId: string;
  stageId: string;
  title: string;
  value: number;
  currency: string;
  status: "open" | "won" | "lost";
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  contact?: Contact;
  stage?: Stage;
}

// ─── Activity ───────────────────────────────────────────

export type ActivityType =
  | "note"
  | "email_sent"
  | "email_received"
  | "sms_sent"
  | "sms_received"
  | "call"
  | "stage_change"
  | "opportunity_created"
  | "tag_added"
  | "tag_removed";

export interface Activity {
  id: string;
  userId: string;
  contactId: string;
  opportunityId: string | null;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Communications ─────────────────────────────────────

export type MessageDirection = "inbound" | "outbound";

export interface EmailMessage {
  id: string;
  userId: string;
  contactId: string;
  direction: MessageDirection;
  subject: string;
  body: string;
  status: string;
  messageId: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
}

export interface SmsMessage {
  id: string;
  userId: string;
  contactId: string;
  direction: MessageDirection;
  body: string;
  status: string;
  twilioSid: string | null;
  createdAt: string;
}

export interface Call {
  id: string;
  userId: string;
  contactId: string;
  direction: MessageDirection;
  status: string;
  duration: number | null;
  recordingUrl: string | null;
  twilioSid: string | null;
  notes: string | null;
  createdAt: string;
}

// ─── Auth ───────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

// ─── API Responses ──────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
