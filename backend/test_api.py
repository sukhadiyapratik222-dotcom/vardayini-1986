import asyncio
import os
import sys

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding="utf-8")

# Ensure current backend folder is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import httpx
from main import app
from database import ping_database, close_db_connection


async def run_all_tests():
    print("=" * 60)
    print("VARDAYINI SWEET MART — BACKEND VERIFICATION SUITE")
    print("=" * 60)

    # 1. Test MongoDB Ping
    print("\n[1/7] Testing direct MongoDB connection...")
    health = await ping_database()
    print(f"  -> MongoDB OK: {health.get('ok')}")
    print(f"  -> Database Name: {health.get('database')}")
    print(f"  -> Collections ({health.get('collections_count')}): {health.get('collections')}")
    print(f"  -> Stats: {health.get('stats')}")
    assert health.get("ok"), "MongoDB ping failed!"

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 2. Test Health Endpoint
        print("\n[2/7] Testing GET /api/health...")
        res = await client.get("/api/health")
        print(f"  -> Status: {res.status_code}")
        data = res.json()
        print(f"  -> Status string: {data.get('status')}")
        assert res.status_code == 200
        assert data.get("status") == "healthy"

        # 3. Test Products Listing
        print("\n[3/7] Testing GET /api/products...")
        res = await client.get("/api/products?limit=5")
        print(f"  -> Status: {res.status_code}")
        data = res.json()
        print(f"  -> Total products in catalog: {data.get('total')}")
        print(f"  -> Retrieved in sample: {len(data.get('products', []))}")
        if data.get("products"):
            sample = data["products"][0]
            print(f"  -> Sample Product: #{sample.get('id')} {sample.get('name')} (Price: ₹{sample.get('price')})")
        assert res.status_code == 200
        assert data.get("total", 0) > 0

        # 4. Test Customer Registration & Login
        print("\n[4/7] Testing Customer Registration & Login...")
        test_email = f"test_{int(asyncio.get_event_loop().time() * 1000)}@example.com"
        test_phone = "9876543219"
        reg_payload = {
            "name": "Harshil Patel",
            "email": test_email,
            "phone": test_phone,
            "password": "SecurePassword123!",
        }
        res = await client.post("/api/customers/register", json=reg_payload)
        print(f"  -> Registration Status: {res.status_code}")
        reg_data = res.json()
        print(f"  -> Message: {reg_data.get('message')}")
        print(f"  -> Token received: {bool(reg_data.get('access_token'))}")
        assert res.status_code in [201, 409]

        token = reg_data.get("access_token")
        if res.status_code == 201 and token:
            me_res = await client.get("/api/customers/me", headers={"Authorization": f"Bearer {token}"})
            print(f"  -> Customer Profile GET /api/customers/me: {me_res.status_code}")
            assert me_res.status_code == 200

        # 5. Test Order Creation
        print("\n[5/7] Testing Order Creation (POST /api/orders)...")
        order_payload = {
            "name": "Harshil Patel",
            "phone": "9876543219",
            "fulfillmentType": "delivery",
            "address": {
                "name": "Harshil Patel",
                "phone": "9876543219",
                "line1": "Flat 402, Navjivan Complex, Station Road",
                "city": "Kalol",
                "state": "Gujarat",
                "pincode": "382721",
            },
            "deliverySlot": "Morning Batch (8:00 AM – 11:30 AM)",
            "paymentMethod": "cod",
            "items": [
                {
                    "productId": 1,
                    "productName": "Royal Kaju Katli",
                    "variantWeight": "500 g",
                    "unitPrice": 559.0,
                    "quantity": 2,
                    "imageUrl": "/images/kaju-katli.jpg",
                }
            ],
            "couponCode": "FESTIVE15",
            "notes": "Please pack with extra butter paper.",
        }
        res = await client.post("/api/orders", json=order_payload)
        print(f"  -> Create Order Status: {res.status_code}")
        order_data = res.json()
        print(f"  -> Order Number: {order_data.get('orderNumber')}")
        order = order_data.get("order", {})
        print(f"  -> Subtotal: ₹{order.get('subtotal')} | Discount: ₹{order.get('discount')} | Tax: ₹{order.get('tax')} | Grand Total: ₹{order.get('total')}")
        assert res.status_code == 201
        created_order_number = order_data.get("orderNumber")

        # 6. Test Order Status Update (Admin)
        print("\n[6/7] Testing Order Status Update (PATCH /api/orders/{orderNumber}/status)...")
        status_res = await client.patch(
            f"/api/orders/{created_order_number}/status",
            headers={"x-admin-key": "vardayini_admin_secret_1986"},
            json={"status": "confirmed", "note": "Order verified by Kalol kitchen."},
        )
        print(f"  -> Status Update Code: {status_res.status_code}")
        updated_order = status_res.json().get("order", {})
        print(f"  -> Updated Order Status: {updated_order.get('status')}")
        assert status_res.status_code == 200
        assert updated_order.get("status") == "confirmed"

        # 7. Test CORS headers
        print("\n[7/7] Testing CORS Preflight (OPTIONS /api/products)...")
        cors_res = await client.options(
            "/api/products",
            headers={
                "Origin": "https://vardayini.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type,x-admin-key",
            },
        )
        print(f"  -> CORS Preflight Status: {cors_res.status_code}")
        print(f"  -> Allow Origin: {cors_res.headers.get('access-control-allow-origin')}")
        assert cors_res.status_code in [200, 204]

    await close_db_connection()
    print("\n" + "=" * 60)
    print("ALL 7 VERIFICATION TESTS PASSED SUCCESSFULLY! (100% READY)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
