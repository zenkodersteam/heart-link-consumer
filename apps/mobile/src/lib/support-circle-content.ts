/**
 * Support Circle content now lives in `@heartlink/consumer-content`, so the
 * website and the phone app cannot drift into offering different prompts.
 *
 * Kept as a re-export rather than deleted: this path is what the screen already
 * imports, and the indirection costs nothing.
 */
export {
  MOMENTS,
  MAILROOM_RULES,
  PLAN_WORD_LIMITS,
  PRE_SEND_CHECKLIST,
  TOTAL_PROMPT_COUNT,
  findMoment,
  findPrompt,
  wordLimitForPlan,
  type Moment,
  type Prompt,
  type MailroomRule,
  type MomentIconKey,
  type PlanKey,
  type PlanWordLimit,
} from '@heartlink/consumer-content';
