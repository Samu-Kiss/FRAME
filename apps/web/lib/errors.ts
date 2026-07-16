// Maps semantic API error codes (§2.17) to UI copy.
const UI_MESSAGES: Record<string, string> = {
  "PLAN_LIMIT_EXCEEDED:active_projects":
    "You reached your plan's active project limit. Archive a project or upgrade to Pro.",
  "PLAN_LIMIT_EXCEEDED:collaborators":
    "You reached your plan's collaborator limit. Upgrade to add more members.",
  "PLAN_LIMIT_EXCEEDED:export_type": "This export format is not included in your plan.",
  "PLAN_LIMIT_EXCEEDED:exports_per_day": "You reached today's export limit for your plan.",
  NOT_A_MEMBER: "You are not a member of this project.",
  PRODUCTION_DAY_EXISTS: "A production day already exists for that date.",
  CANNOT_REMOVE_OWNER: "The project owner cannot be removed.",
}

export function parseApiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (UI_MESSAGES[message]) return UI_MESSAGES[message]
  if (message.startsWith("MISSING_PERMISSION:")) {
    return "You don't have permission to do that in this project."
  }
  if (message.startsWith("ENTITY_NOT_FOUND:")) {
    return "That item no longer exists — it may have been deleted."
  }
  if (message === "UNAUTHORIZED") return "Your session expired. Please log in again."
  return "Something went wrong. Please try again."
}

export function isPlanLimit(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.startsWith("PLAN_LIMIT_EXCEEDED")
}
