import { db } from "@/lib/db";
import { sendEmail } from "@/lib/mailgun";
import { sendSms } from "@/lib/twilio";

// ─── Types ──────────────────────────────────────────────

export type TriggerType =
  | "deal_stage_change"
  | "contact_created"
  | "tag_added"
  | "appointment_created";

export type ActionType =
  | "send_email"
  | "send_sms"
  | "add_tag"
  | "remove_tag"
  | "move_stage"
  | "wait";

interface TriggerContext {
  userId: string;
  contactId: string;
  metadata?: Record<string, unknown>;
}

interface StepConfig {
  subject?: string;
  body?: string;
  tagId?: string;
  tagName?: string;
  stageId?: string;
  pipelineId?: string;
  minutes?: number;
}

interface AutomationStep {
  id: string;
  automationId: string;
  position: number;
  action: string;
  config: unknown;
}

// ─── Placeholder replacement ────────────────────────────

function replacePlaceholders(
  text: string,
  contact: { firstName: string; lastName: string; email: string | null }
): string {
  return text
    .replace(/\{\{firstName\}\}/g, contact.firstName)
    .replace(/\{\{lastName\}\}/g, contact.lastName)
    .replace(/\{\{email\}\}/g, contact.email || "");
}

// ─── Execute a single step ──────────────────────────────

async function executeStep(
  step: AutomationStep,
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  },
  userId: string
): Promise<{ success: boolean; message: string }> {
  const config = step.config as StepConfig;
  const action = step.action as ActionType;

  switch (action) {
    case "send_email": {
      if (!contact.email) {
        return { success: false, message: "Contact has no email address" };
      }
      if (!config.subject || !config.body) {
        return { success: false, message: "Email subject and body are required" };
      }
      try {
        const subject = replacePlaceholders(config.subject, contact);
        const body = replacePlaceholders(config.body, contact);
        await sendEmail(contact.email, subject, body);
        return { success: true, message: `Email sent to ${contact.email}` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { success: false, message: `Failed to send email: ${msg}` };
      }
    }

    case "send_sms": {
      if (!contact.phone) {
        return { success: false, message: "Contact has no phone number" };
      }
      if (!config.body) {
        return { success: false, message: "SMS body is required" };
      }
      try {
        const body = replacePlaceholders(config.body, contact);
        await sendSms(contact.phone, body);
        return { success: true, message: `SMS sent to ${contact.phone}` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { success: false, message: `Failed to send SMS: ${msg}` };
      }
    }

    case "add_tag": {
      if (!config.tagName && !config.tagId) {
        return { success: false, message: "Tag name or ID is required" };
      }
      try {
        let tagId = config.tagId;
        if (!tagId && config.tagName) {
          const tag = await db.tag.upsert({
            where: { name: config.tagName },
            update: {},
            create: { name: config.tagName },
          });
          tagId = tag.id;
        }
        const existing = await db.tagOnContact.findUnique({
          where: { contactId_tagId: { contactId: contact.id, tagId: tagId! } },
        });
        if (!existing) {
          await db.tagOnContact.create({
            data: { contactId: contact.id, tagId: tagId! },
          });
        }
        return { success: true, message: `Tag added to contact` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { success: false, message: `Failed to add tag: ${msg}` };
      }
    }

    case "remove_tag": {
      if (!config.tagId) {
        return { success: false, message: "Tag ID is required" };
      }
      try {
        await db.tagOnContact.deleteMany({
          where: { contactId: contact.id, tagId: config.tagId },
        });
        return { success: true, message: `Tag removed from contact` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { success: false, message: `Failed to remove tag: ${msg}` };
      }
    }

    case "move_stage": {
      if (!config.stageId) {
        return { success: false, message: "Stage ID is required" };
      }
      try {
        const opportunities = await db.opportunity.findMany({
          where: { contactId: contact.id, userId },
        });
        if (opportunities.length === 0) {
          return { success: false, message: "Contact has no opportunities" };
        }
        await db.opportunity.updateMany({
          where: { contactId: contact.id, userId },
          data: { stageId: config.stageId },
        });
        return {
          success: true,
          message: `Moved ${opportunities.length} opportunity(ies) to new stage`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        return { success: false, message: `Failed to move stage: ${msg}` };
      }
    }

    case "wait": {
      const minutes = config.minutes || 0;
      return {
        success: true,
        message: `Wait ${minutes} minute(s) (logged only, no delay applied)`,
      };
    }

    default:
      return { success: false, message: `Unknown action: ${action}` };
  }
}

// ─── Fire automation ────────────────────────────────────

export async function fireAutomation(
  trigger: TriggerType,
  context: TriggerContext
): Promise<void> {
  try {
    const automations = await db.automation.findMany({
      where: {
        userId: context.userId,
        trigger,
        active: true,
      },
      include: {
        steps: { orderBy: { position: "asc" } },
      },
    });

    if (automations.length === 0) return;

    const contact = await db.contact.findUnique({
      where: { id: context.contactId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    if (!contact) return;

    for (const automation of automations) {
      // Check triggerConfig filters
      if (automation.triggerConfig && typeof automation.triggerConfig === "object") {
        const cfg = automation.triggerConfig as Record<string, unknown>;

        if (trigger === "deal_stage_change") {
          if (cfg.stageId && cfg.stageId !== context.metadata?.stageId) continue;
          if (cfg.pipelineId && cfg.pipelineId !== context.metadata?.pipelineId)
            continue;
        }

        if (trigger === "tag_added") {
          if (cfg.tagId && cfg.tagId !== context.metadata?.tagId) continue;
        }
      }

      for (let i = 0; i < automation.steps.length; i++) {
        const step = automation.steps[i];
        const result = await executeStep(step, contact, context.userId);

        await db.automationLog.create({
          data: {
            automationId: automation.id,
            contactId: contact.id,
            stepIndex: i,
            status: result.success ? "success" : "error",
            message: result.message,
          },
        });
      }
    }
  } catch (error) {
    console.error("fireAutomation error:", error);
  }
}
