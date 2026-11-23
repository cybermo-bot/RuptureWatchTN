// A playbook: the rules agreed for one medicine before a crisis (Phase 2.1). This prototype holds
// drafts only: typed, versioned, read-only, checked into the repository. Approval and version
// pinning on every decision belong to a later migration (docs/DECISIONS.md, session 6).
//
// A playbook never copies a threshold: `signal` and `allocation` are the very objects the
// evaluator and the split use (lib/signal/params.ts, lib/allocation/params.ts). Its words live in
// messages/fr/core.json under core.playbook. It names roles, never a person; its clauses carry no
// content until qualified reviewers write it (CLAUDE.md rule 11).

import type { AllocationParams } from '@/lib/allocation/params';
import type { Level, SignalParams } from '@/lib/signal';

/** Roles proposed to review a clause or able to act. Words in core.playbook.roles. */
export type PlaybookRole =
  | 'pharmacy'
  | 'hospital_pharmacy'
  | 'wholesaler'
  | 'central_pharmacy'
  | 'coordinator'
  | 'supply_coordinator'
  | 'pharmacists_order'
  | 'prescriber'
  | 'clinical_reviewer'
  | 'qualified_clinical_reviewers'
  | 'public';

/** What a role can do in the platform at a level. Words in core.playbook.actions. */
export type PlaybookAction =
  | 'report'
  | 'receiveAlert'
  | 'followSignal'
  | 'proposeSplit'
  | 'recordDecision'
  | 'announceArrival'
  | 'messagePharmacists'
  | 'checkStatus'
  | 'publicStatus'
  | 'reportDelivered'
  | 'resumeOrders';

export type ClauseId = 'continuity' | 'orderCap' | 'substitution';

export interface PlaybookClause {
  id: ClauseId;
  /** Roles proposed to review it: never a name. */
  reviewers: PlaybookRole[];
  /** No clause is validated in this prototype. */
  state: 'pending_validation';
  /** The clause's text: null until reviewers supply it. We never write it. */
  text: null;
}

export interface Playbook {
  /** Stable id, used in the URL. */
  id: string;
  version: string;
  status: 'draft';
  /** The exact molecule name of the CNAM catalogue (molecules.name). */
  molecule: string;
  /** For now a playbook covers every CNAM presentation of the molecule. */
  granularity: 'molecule';
  /** When this version was drafted (YYYY-MM-DD). */
  draftedOn: string;
  /** The evaluator's own parameters, by reference. */
  signal: SignalParams;
  /** The split's own parameters, by reference. */
  allocation: AllocationParams;
  /** The level from which the playbook's actions start. */
  triggerLevel: Extract<Level, 'likely' | 'confirmed'>;
  /** Who can act at each level, and what the platform lets them do. */
  actors: Record<Exclude<Level, 'none'>, { role: PlaybookRole; actions: PlaybookAction[] }[]>;
  clauses: PlaybookClause[];
}
