from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
import re


class OrderItemSchema(BaseModel):
    productId: Optional[int] = None
    productName: str = Field(..., description="Name of the mithai/farsan product")
    variantWeight: str = Field(..., description="Package size, e.g. 500 g, 1 kg")
    unitPrice: float = Field(..., ge=0, description="Unit price per item")
    quantity: int = Field(..., ge=1, description="Quantity ordered")
    imageUrl: Optional[str] = "/images/kaju-katli.jpg"

    class Config:
        extra = "ignore"


class OrderAddressSchema(BaseModel):
    name: str = Field(..., min_length=2)
    phone: str = Field(...)
    line1: str = Field(..., min_length=3, description="Street address, house number, area")
    city: str = Field(default="Kalol")
    state: str = Field(default="Gujarat")
    pincode: str = Field(default="382721", description="6-digit Indian PIN code")

    @field_validator("pincode")
    @classmethod
    def validate_pin(cls, v: str) -> str:
        clean = re.sub(r"\D", "", v)
        if len(clean) != 6:
            raise ValueError("Pincode must be exactly 6 digits.")
        return clean


class OrderCreate(BaseModel):
    name: Optional[str] = Field(None, description="Recipient name")
    phone: str = Field(..., description="Customer 10-digit phone number")
    fulfillmentType: str = Field(default="delivery", description="'delivery' or 'pickup'")
    address: Optional[OrderAddressSchema] = Field(None, description="Shipping address for delivery orders")
    deliverySlot: Optional[str] = Field(default="Morning Batch (8:00 AM – 11:30 AM)")
    pickupStoreId: Optional[int] = Field(default=None, description="Store ID for pickup orders")
    pickupDate: Optional[str] = Field(default=None, description="Pickup date (YYYY-MM-DD)")
    pickupSlot: Optional[str] = Field(default=None, description="Store time slot for pickup")
    paymentMethod: str = Field(default="cod", description="'cod' or 'upi'")
    items: List[OrderItemSchema] = Field(..., min_length=1, description="List of items in the order")
    couponCode: Optional[str] = Field(default=None, description="Optional coupon code (e.g. FESTIVE15)")
    notes: Optional[str] = Field(default=None, description="Special instructions")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        clean = re.sub(r"\D", "", v)
        if len(clean) == 12 and clean.startswith("91"):
            clean = clean[2:]
        if len(clean) != 10 or clean[0] not in "6789":
            raise ValueError("Recipient phone must be a valid 10-digit Indian mobile number.")
        return clean


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., description="New order status")
    note: Optional[str] = Field(None, description="Operational update note")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = {
            "pending",
            "confirmed",
            "preparing",
            "ready",
            "out_for_delivery",
            "delivered",
            "picked_up",
            "cancelled",
        }
        low = v.strip().lower()
        if low not in valid_statuses:
            raise ValueError(f"Invalid status '{v}'. Allowed: {', '.join(sorted(valid_statuses))}")
        return low


class OrderResponse(BaseModel):
    id: int
    orderNumber: str
    userId: Optional[int] = None
    guestName: Optional[str] = None
    guestPhone: Optional[str] = None
    status: str = "pending"
    subtotal: float
    discount: float = 0
    deliveryFee: float = 0
    tax: float = 0
    total: float
    paymentMethod: str = "cod"
    paymentStatus: str = "pending"
    fulfillmentType: str = "delivery"
    items: List[OrderItemSchema] = []
    addressSnapshot: Optional[Any] = None
    deliverySlot: Optional[str] = None
    couponCode: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        extra = "ignore"
