/**
 * Order state machine transitions.
 * - Allowed status graph: pending → confirmed → packed → shipped → delivered.
 * - Cancellation is allowed only before 'shipped' (i.e. 'pending', 'confirmed', 'packed').
 * - Cancellation after 'shipped' is strictly rejected.
 * - 'delivered' and 'cancelled' are strictly terminal states (transitions out are rejected).
 */

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "picked_up"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "packed", "shipped", "ready_for_pickup", "cancelled"],
  preparing: ["ready_for_pickup", "packed", "shipped", "cancelled"],
  packed: ["shipped", "ready_for_pickup", "cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
  shipped: ["delivered"],
  picked_up: [],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrder(currentStatus: string, targetStatus: string): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus as OrderStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus as OrderStatus);
}

export function canCancelOrder(currentStatus: string): boolean {
  return (
    currentStatus === "pending" ||
    currentStatus === "confirmed" ||
    currentStatus === "preparing" ||
    currentStatus === "packed"
  );
}

export const canCustomerCancel = canCancelOrder;
