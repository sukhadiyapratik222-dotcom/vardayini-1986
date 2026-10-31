import json
import secrets
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Header, Query, status

from database import get_database, serialize_mongo_doc
from schemas.order import (
    OrderCreate,
    OrderStatusUpdate,
    OrderResponse,
    OrderItemSchema,
)
from auth import (
    get_current_user_optional,
    require_admin,
    ADMIN_SECRET_KEY,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


def generate_order_number() -> str:
    """Generates an authentic Vardayini order tracking code (e.g. VSM-20261031-A9F3)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    date_stamp = now.strftime("%Y%m%d")
    hex_suffix = secrets.token_hex(4).upper()
    return f"VSM-{date_stamp}-{hex_suffix}"


async def get_next_order_id(db) -> int:
    """Calculates next sequential integer order id."""
    highest = await db.orders.find_one({}, sort=[("id", -1)])
    if highest and isinstance(highest.get("id"), int):
        return highest["id"] + 1
    return 1


def format_order_response(order_doc: Dict[str, Any]) -> OrderResponse:
    """Formats MongoDB order document into strongly typed OrderResponse."""
    created = order_doc.get("createdAt")
    created_str = created.isoformat() if hasattr(created, "isoformat") else str(created or "")

    updated = order_doc.get("updatedAt")
    updated_str = updated.isoformat() if hasattr(updated, "isoformat") else str(updated or "")

    # Clean items
    items_raw = order_doc.get("items", [])
    parsed_items: List[OrderItemSchema] = []
    for it in items_raw:
        parsed_items.append(
            OrderItemSchema(
                productId=it.get("productId"),
                productName=it.get("productName", "Sweet Item"),
                variantWeight=it.get("variantWeight", "500 g"),
                unitPrice=float(it.get("unitPrice", 0)),
                quantity=int(it.get("quantity", 1)),
                imageUrl=it.get("imageUrl", "/images/kaju-katli.jpg"),
            )
        )

    return OrderResponse(
        id=int(order_doc.get("id", 0)),
        orderNumber=order_doc.get("orderNumber", ""),
        userId=order_doc.get("userId"),
        guestName=order_doc.get("guestName"),
        guestPhone=order_doc.get("guestPhone"),
        status=order_doc.get("status", "pending"),
        subtotal=float(order_doc.get("subtotal", 0)),
        discount=float(order_doc.get("discount", 0)),
        deliveryFee=float(order_doc.get("deliveryFee", 0)),
        tax=float(order_doc.get("tax", 0)),
        total=float(order_doc.get("total", 0)),
        paymentMethod=order_doc.get("paymentMethod", "cod"),
        paymentStatus=order_doc.get("paymentStatus", "pending"),
        fulfillmentType=order_doc.get("fulfillmentType", "delivery"),
        items=parsed_items,
        addressSnapshot=order_doc.get("addressSnapshot"),
        deliverySlot=order_doc.get("deliverySlot"),
        couponCode=order_doc.get("couponCode"),
        createdAt=created_str,
        updatedAt=updated_str,
    )


# ------------------------------------------------------------------------------
# 1. CREATE ORDER (POST /api/orders)
# ------------------------------------------------------------------------------
@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """
    Places a new e-commerce order, computes totals with GST and delivery rules,
    and inserts into the MongoDB 'orders' collection.
    """
    db = await get_database()

    if not payload.items:
        raise HTTPException(status_code=400, detail="An order must contain at least one item.")

    # 1. Calculate subtotal
    subtotal = sum(item.unitPrice * item.quantity for item in payload.items)

    # 2. Compute coupon discount if applicable
    discount = 0.0
    if payload.couponCode:
        code_upper = payload.couponCode.strip().upper()
        # Query coupons collection or apply built-in FESTIVE15 rules
        coupon_doc = await db.coupons.find_one({"code": code_upper, "isActive": True})
        if coupon_doc:
            pct = float(coupon_doc.get("discountPercent", 0))
            min_order = float(coupon_doc.get("minOrder", 0))
            if subtotal >= min_order:
                discount = round((subtotal * pct) / 100.0, 2)
        elif code_upper == "FESTIVE15" and subtotal >= 999:
            discount = round(subtotal * 0.15, 2)

    # 3. Compute delivery fee
    is_pickup = payload.fulfillmentType.lower() == "pickup"
    delivery_fee = 0.0 if (is_pickup or (subtotal - discount) >= 799) else 50.0

    # 4. Compute 5% GST
    taxable_amount = max(0.0, subtotal - discount)
    tax = round(taxable_amount * 0.05, 2)

    # 5. Compute Grand Total
    total = round(taxable_amount + delivery_fee + tax, 2)

    # Generate sequential ID and tracking number
    next_id = await get_next_order_id(db)
    order_number = generate_order_number()
    now = datetime.datetime.now(datetime.timezone.utc)

    # Build address snapshot
    address_data = None
    if payload.address:
        address_data = payload.address.model_dump()
    elif is_pickup and payload.pickupStoreId:
        store_doc = await db.stores.find_one({"id": payload.pickupStoreId})
        if store_doc:
            address_data = {
                "name": store_doc.get("name", "Store Pickup"),
                "phone": store_doc.get("phone", ""),
                "line1": store_doc.get("address", ""),
                "city": store_doc.get("city", "Kalol"),
                "pincode": "382721",
            }

    recipient_name = payload.name or (payload.address.name if payload.address else "Valued Patron")
    user_id = current_user.get("id") if current_user else None

    order_doc = {
        "id": next_id,
        "orderNumber": order_number,
        "userId": user_id,
        "guestName": recipient_name,
        "guestPhone": payload.phone,
        "status": "pending",
        "subtotal": round(subtotal, 2),
        "discount": discount,
        "deliveryFee": delivery_fee,
        "tax": tax,
        "total": total,
        "paymentMethod": payload.paymentMethod.lower(),
        "paymentStatus": "paid" if payload.paymentMethod.lower() == "upi" else "pending",
        "fulfillmentType": payload.fulfillmentType.lower(),
        "deliverySlot": payload.deliverySlot,
        "pickupStoreId": payload.pickupStoreId,
        "pickupDate": payload.pickupDate,
        "pickupSlot": payload.pickupSlot,
        "addressSnapshot": json.dumps(address_data) if address_data else None,
        "items": [it.model_dump() for it in payload.items],
        "couponCode": payload.couponCode,
        "notes": payload.notes,
        "createdAt": now,
        "updatedAt": now,
    }

    await db.orders.insert_one(order_doc)

    # Optional: Record admin notification in MongoDB
    try:
        await db.admin_notifications.insert_one({
            "type": "order_placed",
            "title": f"New Order {order_number} Received! 🛍️",
            "message": f"{recipient_name} placed an order worth ₹{total} via {payload.paymentMethod.upper()}.",
            "data": json.dumps({"orderNumber": order_number, "total": total}),
            "is_read": False,
            "created_at": now,
        })
    except Exception:
        pass

    formatted = format_order_response(order_doc)
    return {
        "message": "Order created successfully! Thank you for ordering from Vardayini Sweet Mart.",
        "order": formatted.model_dump(),
        "orderNumber": order_number,
    }


# ------------------------------------------------------------------------------
# 2. LIST ORDERS (GET /api/orders)
# ------------------------------------------------------------------------------
@router.get("", response_model=Dict[str, Any])
async def list_orders(
    phone: Optional[str] = Query(None, description="Filter orders by customer phone"),
    status: Optional[str] = Query(None, description="Filter orders by status"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
    x_admin_key: Optional[str] = Header(None),
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional),
):
    """
    Retrieves orders:
    - Admins see all orders.
    - Logged in customers see their own orders.
    - Guests can filter by their phone number.
    """
    db = await get_database()
    query: Dict[str, Any] = {}

    is_admin = x_admin_key == ADMIN_SECRET_KEY or (current_user and current_user.get("role") in ["admin", "super_admin"])

    if not is_admin:
        if current_user and current_user.get("id"):
            query["$or"] = [
                {"userId": current_user["id"]},
                {"guestPhone": current_user.get("phone", "NONE")},
            ]
        elif phone:
            query["guestPhone"] = phone.strip()
        else:
            raise HTTPException(
                status_code=401,
                detail="Authentication or phone parameter required to retrieve orders.",
            )

    if status:
        query["status"] = status.strip().lower()

    total_count = await db.orders.count_documents(query)
    cursor = db.orders.find(query).sort("id", -1).skip(skip).limit(limit)
    order_docs = await cursor.to_list(length=limit)

    return {
        "orders": [format_order_response(d).model_dump() for d in order_docs],
        "total": total_count,
    }


# ------------------------------------------------------------------------------
# 3. GET SINGLE ORDER (GET /api/orders/{order_number})
# ------------------------------------------------------------------------------
@router.get("/{order_number}", response_model=Dict[str, Any])
async def get_order_by_number(order_number: str):
    """Retrieves full details of an order using its orderNumber or numeric ID."""
    db = await get_database()

    query: Dict[str, Any] = {}
    if order_number.isdigit():
        query["$or"] = [{"id": int(order_number)}, {"orderNumber": order_number}]
    else:
        query["orderNumber"] = order_number.strip()

    doc = await db.orders.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Order '{order_number}' not found.")

    formatted = format_order_response(doc)
    return {"order": formatted.model_dump()}


# ------------------------------------------------------------------------------
# 4. UPDATE ORDER STATUS (PATCH / PUT /api/orders/{order_number}/status) [Admin Protected]
# ------------------------------------------------------------------------------
@router.patch("/{order_number}/status", response_model=Dict[str, Any])
@router.put("/{order_number}/status", response_model=Dict[str, Any])
async def update_order_status(
    order_number: str,
    payload: OrderStatusUpdate,
    x_admin_key: Optional[str] = Header(None),
):
    """Updates order status in MongoDB (e.g. pending -> confirmed -> out_for_delivery -> delivered)."""
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin authorization required to update order status.")

    db = await get_database()
    query = {"id": int(order_number)} if order_number.isdigit() else {"orderNumber": order_number.strip()}

    existing = await db.orders.find_one(query)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Order '{order_number}' not found.")

    now = datetime.datetime.now(datetime.timezone.utc)
    update_data: Dict[str, Any] = {
        "status": payload.status,
        "updatedAt": now,
    }

    if payload.status == "delivered" or payload.status == "picked_up":
        update_data["paymentStatus"] = "paid"

    await db.orders.update_one(query, {"$set": update_data})
    refreshed = await db.orders.find_one(query)

    return {
        "message": f"Order status updated to '{payload.status}'.",
        "order": format_order_response(refreshed).model_dump(),
    }
