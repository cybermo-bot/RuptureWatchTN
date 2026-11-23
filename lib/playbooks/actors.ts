// Who can act at each level, and what the platform lets them do today. Shared by every playbook
// (lib/playbooks) and by the scenario's "Qui peut agir ?". A product fact, checked against the
// code: the split from "probable" (grossiste/repartition), an arrival at "probable" or
// "confirmée" (announce_arrival), the public status from "confirmée" (public_molecule_status).

import type { Playbook } from './types';

export const PLATFORM_ACTORS: Playbook['actors'] = {
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
};
