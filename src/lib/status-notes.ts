export interface StatusNoteContext {
  riderName?: string | null;
  actorName?: string | null;
  isTeamMember?: boolean;
}

/**
 * Returns a human-readable, descriptive note for a status transition.
 * Used in delivery_history inserts so the timeline is informative.
 */
export function getStatusNote(status: string, ctx: StatusNoteContext = {}): string {
  const { riderName, actorName, isTeamMember } = ctx;
  const actor = actorName ? ` by ${actorName}${isTeamMember ? ' (team member)' : ''}` : '';

  switch (status) {
    case 'pending':
      return actorName
        ? `Order placed${actor} — awaiting rider assignment`
        : 'Order received and awaiting rider assignment';

    case 'assigned':
      return riderName
        ? `Rider ${riderName} has been assigned and will pick up the package`
        : 'A rider has been assigned and will pick up the package';

    case 'picked_up':
      return riderName
        ? `Package picked up by ${riderName} — heading to delivery location`
        : 'Package has been picked up by the rider';

    case 'in_transit':
      return 'Rider is en route to the delivery location';

    case 'delivered':
      return 'Package has been delivered to the recipient';

    case 'confirmed':
      return 'Recipient confirmed delivery — order complete';

    case 'cancelled':
      return actorName
        ? `Delivery cancelled${actor}`
        : 'Delivery was cancelled';

    case 'delivery_failed':
      return actorName
        ? `Delivery attempt failed — marked${actor}. Sender or recipient may request a reattempt within 48 hours`
        : 'Delivery attempt was unsuccessful. Sender or recipient may request a reattempt within 48 hours';

    case 'returning':
      return riderName
        ? `${riderName} is en route to return the package to the sender`
        : 'Package is being returned to the sender';

    case 'returned':
      return riderName
        ? `Package returned to sender by ${riderName}`
        : 'Package has been returned to the sender';

    default:
      return status;
  }
}

/**
 * For edit/audit events that don't change the status.
 */
export function getEditNote(actorName: string, isTeamMember?: boolean): string {
  return `Order details updated by ${actorName}${isTeamMember ? ' (team member)' : ''}`;
}

/**
 * For draft-to-pending confirmation.
 */
export function getDraftConfirmNote(actorName: string): string {
  return `Draft confirmed by ${actorName} — awaiting rider assignment`;
}
