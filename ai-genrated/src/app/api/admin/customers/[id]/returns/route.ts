import { NextResponse } from "next/server";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, returnRequests, users } from "@/db/schema";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { parsePositiveInt } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authorized = await isAuthorizedAdmin(request, "customers:view");
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden: Customer Directory access required" }, { status: 403 });
  }

  const { id } = await context.params;
  const customerId = parsePositiveInt(id);
  if (!customerId) {
    return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 });
  }

  const [customer] = await db.select().from(users).where(eq(users.id, customerId)).limit(1);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Find customer's orders
  const customerOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      customer.phone
        ? or(eq(orders.userId, customer.id), eq(orders.guestPhone, customer.phone))
        : eq(orders.userId, customer.id)
    );

  const orderIds = customerOrders.map((o) => o.id);

  let returns: any[] = [];
  if (orderIds.length > 0) {
    returns = await db
      .select()
      .from(returnRequests)
      .where(
        or(
          sql`${returnRequests.orderId} IN ${orderIds}`,
          customer.phone ? eq(returnRequests.customerPhone, customer.phone) : sql`1=0`,
          customer.email ? eq(returnRequests.customerEmail, customer.email) : sql`1=0`
        )
      );
  } else if (customer.phone || customer.email) {
    returns = await db
      .select()
      .from(returnRequests)
      .where(
        or(
          customer.phone ? eq(returnRequests.customerPhone, customer.phone) : sql`1=0`,
          customer.email ? eq(returnRequests.customerEmail, customer.email) : sql`1=0`
        )
      );
  }

  return NextResponse.json({
    customerId,
    customerName: customer.name,
    customerPhone: customer.phone,
    returns,
  });
}
