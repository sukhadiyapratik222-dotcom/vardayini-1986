import os
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection

# Load environment configuration from .env
load_dotenv()

logger = logging.getLogger("vardayini.database")

# Environment Variables with safe local defaults
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017/")
PREFERRED_DATABASE_NAME = os.getenv("DATABASE_NAME", "vardayini_sweets")

# Global singleton handles
_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None
_resolved_db_name: str = PREFERRED_DATABASE_NAME


def get_client() -> AsyncIOMotorClient:
    """Returns the singleton Motor AsyncIO MongoDB client."""
    global _client
    if _client is None:
        logger.info(f"Initializing AsyncIOMotorClient to {MONGODB_URI}")
        _client = AsyncIOMotorClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=2500,
            connectTimeoutMS=3000,
            maxPoolSize=20,
            minPoolSize=2,
        )
    return _client


async def resolve_active_database() -> AsyncIOMotorDatabase:
    """
    Connects to the database specified by DATABASE_NAME.
    If the specified database has 0 collections, it intelligently checks if 'vardayini_sweets'
    or 'vardayini' contains existing collections to reuse existing data without duplication.
    """
    global _database, _resolved_db_name
    client = get_client()

    target_name = PREFERRED_DATABASE_NAME
    db = client[target_name]

    try:
        cols = await db.list_collection_names()
        # If target has collections, use it directly
        if cols:
            _resolved_db_name = target_name
            _database = db
            return db

        # If target is empty, check alternate candidates
        existing_dbs = await client.list_database_names()
        candidate_names = ["vardayini_sweets", "vardayini", "master_data"]
        for cand in candidate_names:
            if cand in existing_dbs:
                cand_db = client[cand]
                cand_cols = await cand_db.list_collection_names()
                if "products" in cand_cols or "orders" in cand_cols or "users" in cand_cols:
                    logger.info(f"Auto-resolved existing populated database: '{cand}' ({len(cand_cols)} collections)")
                    _resolved_db_name = cand
                    _database = cand_db
                    return cand_db

        _resolved_db_name = target_name
        _database = db
        return db
    except Exception as e:
        logger.warning(f"Error checking collections during DB resolution: {e}")
        _resolved_db_name = target_name
        _database = db
        return db


async def get_database() -> AsyncIOMotorDatabase:
    """Fast dependency provider to get the active database."""
    global _database
    if _database is None:
        await resolve_active_database()
    return _database  # type: ignore[return-value]


def get_active_db_name() -> str:
    """Returns the currently active database name."""
    return _resolved_db_name


async def ping_database() -> Dict[str, Any]:
    """Tests MongoDB connectivity and returns operational health stats."""
    client = get_client()
    # Ping admin command to verify heartbeat
    ping_result = await client.admin.command("ping")
    db = await get_database()
    collections = await db.list_collection_names()

    # Quick count stats
    products_count = await db.products.count_documents({}) if "products" in collections else 0
    orders_count = await db.orders.count_documents({}) if "orders" in collections else 0
    users_count = await db.users.count_documents({}) if "users" in collections else 0

    return {
        "ok": bool(ping_result.get("ok")),
        "database": _resolved_db_name,
        "collections": collections,
        "collections_count": len(collections),
        "stats": {
            "products": products_count,
            "orders": orders_count,
            "users": users_count,
        },
    }


async def init_db_indexes():
    """Ensures useful indexes exist on products, users, and orders collections."""
    try:
        db = await get_database()

        # Products indexes
        await db.products.create_index("id", unique=True, sparse=True)
        await db.products.create_index("slug", sparse=True)
        await db.products.create_index("categoryId", sparse=True)
        await db.products.create_index("isFeatured")

        # Users / Customers indexes
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("phone", sparse=True)

        # Orders indexes
        await db.orders.create_index("orderNumber", unique=True, sparse=True)
        await db.orders.create_index("userId", sparse=True)
        await db.orders.create_index("createdAt")

        logger.info("MongoDB indexes verified/created successfully.")
    except Exception as e:
        logger.warning(f"Notice while verifying MongoDB indexes: {e}")


async def close_db_connection():
    """Gracefully closes the MongoDB connection pool on server shutdown."""
    global _client, _database
    if _client:
        _client.close()
        _client = None
        _database = None
        logger.info("MongoDB connection pool closed.")


# Helper: clean MongoDB documents for JSON serialization
def serialize_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts MongoDB BSON types like ObjectId and datetime into clean JSON primitives."""
    if not doc:
        return {}
    res = dict(doc)
    if "_id" in res:
        res["_id"] = str(res["_id"])
    for k, v in list(res.items()):
        if hasattr(v, "isoformat"):
            res[k] = v.isoformat()
    return res
