// Draft playbook for LEVETIRACETAM, the antiepileptic of the national showcase (session 6).
// Every threshold is the evaluator's or the split's own object, never a copy. The three clauses
// wait for their reviewers: we write none of them (CLAUDE.md rule 11).

import { ALLOCATION_PARAMS } from '@/lib/allocation/params';
import { DEFAULT_PARAMS } from '@/lib/signal';
import type { Playbook } from './types';

export const LEVETIRACETAM_PLAYBOOK: Playbook = {
  id: 'levetiracetam',
  version: '0.1',
  status: 'draft',
  molecule: 'LEVETIRACETAM',
  granularity: 'molecule',
  draftedOn: '2026-11-24',
  signal: DEFAULT_PARAMS,
  allocation: ALLOCATION_PARAMS,
  triggerLevel: 'likely',
  actors: {
    watch: [
      { role: 'pharmacy', actions: ['report', 'receiveAlert'] },
      { role: 'coordinator', actions: ['followSignal'] },
    ],
    likely: [
      { role: 'pharmacy', actions: ['report', 'receiveAlert'] },
      { role: 'wholesaler', actions: ['proposeSplit', 'recordDecision'] },
      { role: 'central_pharmacy', actions: ['announceArrival'] },
      { role: 'hospital_pharmacy', actions: ['followSignal'] },
      { role: 'coordinator', actions: ['followSignal'] },
      { role: 'pharmacists_order', actions: ['messagePharmacists'] },
      { role: 'prescriber', actions: ['checkStatus'] },
    ],
    confirmed: [
      { role: 'pharmacy', actions: ['report', 'receiveAlert', 'reportDelivered'] },
      { role: 'wholesaler', actions: ['proposeSplit', 'recordDecision'] },
      { role: 'central_pharmacy', actions: ['announceArrival'] },
      { role: 'hospital_pharmacy', actions: ['followSignal'] },
      { role: 'coordinator', actions: ['followSignal'] },
      { role: 'pharmacists_order', actions: ['messagePharmacists'] },
      { role: 'prescriber', actions: ['checkStatus'] },
      { role: 'public', actions: ['publicStatus'] },
    ],
    cleared: [
      { role: 'pharmacy', actions: ['receiveAlert', 'resumeOrders'] },
      { role: 'coordinator', actions: ['followSignal'] },
      { role: 'public', actions: ['publicStatus'] },
    ],
  },
  clauses: [
    { id: 'continuity', reviewers: ['hospital_pharmacy', 'clinical_reviewer'], state: 'pending_validation', text: null },
    { id: 'orderCap', reviewers: ['wholesaler', 'supply_coordinator'], state: 'pending_validation', text: null },
    { id: 'substitution', reviewers: ['qualified_clinical_reviewers'], state: 'pending_validation', text: null },
  ],
};
