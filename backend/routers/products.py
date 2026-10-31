import re
import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, HTTPException, Header, Depends, status
from pydantic import BaseModel

from database import get_database, serialize_mongo_doc
from schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    ProductVariantSchema,
)
from auth import require_admin, ADMIN_SECRET_KEY

router = APIRouter(prefix="/products", tags=["Products"])


def slugify(text: str) -> str:
    """Generates a clean URL slug from title."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


async def get_next_product_id(db) -> int:
    """Calculates next sequential integer product id."""
    highest = await db.products.find_one({}, sort=[("id", -1)])
    if highest and isinstance(highest.get("id"), int):
        return highest["id"] + 1
    return 1


async def get_next_variant_id(db) -> int:
    """Calculates next sequential integer variant id."""
    highest = await db.product_variants.find_one({}, sort=[("id", -1)])
    if highest and isinstance(highest.get("id"), int):
        return highest["id"] + 1
    return 1


async def enrich_product(db, prod_doc: Dict[str, Any]) -> ProductResponse:
    """Attaches variants, computed prices, and category name to a product document."""
    prod_id = prod_doc.get("id")

    # Fetch variants for this product
    variants_cursor = db.product_variants.find({"productId": prod_id})
    variants_docs = await variants_cursor.to_list(length=50)

    # If no separate product_variants rows, check if embedded
    if not variants_docs and "variants" in prod_doc and isinstance(prod_doc["variants"], list):
        variants_docs = prod_doc["variants"]

    parsed_variants: List[ProductVariantSchema] = []
    min_price: Optional[float] = None
    min_discounted: Optional[float] = None
    total_stock: int = 0

    for v in variants_docs:
        price = float(v.get("price", 0))
        disc = float(v.get("discountedPrice", 0)) if v.get("discountedPrice") is not None else None
        stock = int(v.get("stock", 0))
        total_stock += stock

        effective_price = disc if disc is not None and disc > 0 else price
        if min_price is None or effective_price < min_price:
            min_price = effective_price
            min_discounted = disc

        parsed_variants.append(
            ProductVariantSchema(
                id=v.get("id"),
                sku=v.get("sku"),
                weight=str(v.get("weight", "Standard")),
                price=price,
                discountedPrice=disc,
                stock=stock,
            )
        )

    # Category name lookup
    cat_id = prod_doc.get("categoryId")
    cat_name = "Mithai"
    cat_slug = "mithai"
    if cat_id:
        cat_doc = await db.categories.find_one({"id": cat_id})
        if cat_doc:
            cat_name = cat_doc.get("name", "Mithai")
            cat_slug = cat_doc.get("slug", "mithai")

    updated_at_str = None
    if "updatedAt" in prod_doc:
        u = prod_doc["updatedAt"]
        updated_at_str = u.isoformat() if hasattr(u, "isoformat") else str(u)

    return ProductResponse(
        id=int(prod_id) if prod_id is not None else 0,
        name=prod_doc.get("name", ""),
        slug=prod_doc.get("slug", ""),
        categoryId=cat_id or 1,
        categoryName=cat_name,
        categorySlug=cat_slug,
        description=prod_doc.get("description", ""),
        imageUrl=prod_doc.get("imageUrl", "/images/kaju-katli.jpg"),
        tags=prod_doc.get("tags", ""),
        isFeatured=bool(prod_doc.get("isFeatured", False)),
        variants=parsed_variants,
        price=min_price,
        discountedPrice=min_discounted,
        unitPrice=min_price,
        stock=total_stock,
        updatedAt=updated_at_str,
    )


# ------------------------------------------------------------------------------
# 1. LIST PRODUCTS (GET /api/products)
# ------------------------------------------------------------------------------
@router.get("", response_model=Dict[str, Any])
async def list_products(
    category: Optional[str] = Query(None, description="Category slug or name filter"),
    search: Optional[str] = Query(None, description="Text search by title, description or tags"),
    tag: Optional[str] = Query(None, description="Filter by tag (e.g. bestseller)"),
    featured: Optional[bool] = Query(None, description="Filter only featured items"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    """
    Retrieves catalog products with real-time variants, prices, and stock from MongoDB.
    Supports search, category filtering, and tag filtering.
    """
    db = await get_database()
    query: Dict[str, Any] = {}

    if featured is not None:
        query["isFeatured"] = featured

    if tag:
        query["tags"] = {"$regex": tag, "$options": "i"}

    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"name": search_regex},
            {"description": search_regex},
            {"tags": search_regex},
            {"slug": search_regex},
        ]

    if category:
        # Check if category corresponds to a category slug in categories collection
        cat_doc = await db.categories.find_one({"slug": category.lower()})
        if cat_doc and "id" in cat_doc:
            query["categoryId"] = cat_doc["id"]
        elif category.isdigit():
            query["categoryId"] = int(category)

    total_count = await db.products.count_documents(query)
    cursor = db.products.find(query).sort("id", 1).skip(skip).limit(limit)
    product_docs = await cursor.to_list(length=limit)

    enriched_products = [await enrich_product(db, doc) for doc in product_docs]

    return {
        "products": [p.model_dump() for p in enriched_products],
        "total": total_count,
        "page": (skip // limit) + 1,
        "limit": limit,
    }


# ------------------------------------------------------------------------------
# 2. GET SINGLE PRODUCT (GET /api/products/{id_or_slug})
# ------------------------------------------------------------------------------
@router.get("/{id_or_slug}", response_model=Dict[str, Any])
async def get_product(id_or_slug: str):
    """Retrieves a single product by numeric ID or URL slug."""
    db = await get_database()

    query: Dict[str, Any] = {}
    if id_or_slug.isdigit():
        query["$or"] = [{"id": int(id_or_slug)}, {"slug": id_or_slug}]
    else:
        query["slug"] = id_or_slug

    doc = await db.products.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Product '{id_or_slug}' not found.")

    enriched = await enrich_product(db, doc)
    return {"product": enriched.model_dump()}


# ------------------------------------------------------------------------------
# 3. CREATE PRODUCT (POST /api/products) [Admin Protected]
# ------------------------------------------------------------------------------
@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    x_admin_key: Optional[str] = Header(None),
):
    """Creates a new product and associates its packaging variants in MongoDB."""
    # Check Admin Header or Secret
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin authorization required to create products.")

    db = await get_database()
    next_id = await get_next_product_id(db)
    slug = payload.slug or slugify(payload.name)

    # Ensure slug uniqueness
    existing_slug = await db.products.find_one({"slug": slug})
    if existing_slug:
        slug = f"{slug}-{next_id}"

    now = datetime.datetime.now(datetime.timezone.utc)
    product_doc = {
        "id": next_id,
        "name": payload.name.strip(),
        "slug": slug,
        "categoryId": payload.categoryId,
        "description": payload.description or "",
        "imageUrl": payload.imageUrl or "/images/kaju-katli.jpg",
        "tags": payload.tags or "",
        "isFeatured": bool(payload.isFeatured),
        "updatedAt": now,
        "createdAt": now,
    }

    await db.products.insert_one(product_doc)

    # Insert variants
    variants_to_insert = payload.variants or []
    if not variants_to_insert and payload.price is not None:
        variants_to_insert = [
            ProductVariantSchema(
                weight=payload.weight or "500 g",
                price=payload.price,
                discountedPrice=payload.discountedPrice,
                stock=payload.stock or 50,
            )
        ]

    for v in variants_to_insert:
        var_id = await get_next_variant_id(db)
        await db.product_variants.insert_one({
            "id": var_id,
            "productId": next_id,
            "sku": v.sku or f"VSM-{next_id}-{var_id}",
            "weight": v.weight,
            "price": v.price,
            "discountedPrice": v.discountedPrice,
            "stock": v.stock,
            "updatedAt": now,
        })

    enriched = await enrich_product(db, product_doc)
    return {
        "message": "Product created successfully",
        "product": enriched.model_dump(),
    }


# ------------------------------------------------------------------------------
# 4. UPDATE PRODUCT (PUT /api/products/{id}) [Admin Protected]
# ------------------------------------------------------------------------------
@router.put("/{product_id}", response_model=Dict[str, Any])
async def update_product(
    product_id: int,
    payload: ProductUpdate,
    x_admin_key: Optional[str] = Header(None),
):
    """Updates product information and pricing in MongoDB."""
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin authorization required to update products.")

    db = await get_database()
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail=f"Product #{product_id} not found.")

    update_fields: Dict[str, Any] = {"updatedAt": datetime.datetime.now(datetime.timezone.utc)}
    if payload.name is not None:
        update_fields["name"] = payload.name.strip()
    if payload.slug is not None:
        update_fields["slug"] = payload.slug.strip()
    if payload.categoryId is not None:
        update_fields["categoryId"] = payload.categoryId
    if payload.description is not None:
        update_fields["description"] = payload.description
    if payload.imageUrl is not None:
        update_fields["imageUrl"] = payload.imageUrl
    if payload.tags is not None:
        update_fields["tags"] = payload.tags
    if payload.isFeatured is not None:
        update_fields["isFeatured"] = payload.isFeatured

    await db.products.update_one({"id": product_id}, {"$set": update_fields})

    # Update or sync variant prices/stock if provided
    if payload.price is not None or payload.stock is not None:
        variant_update: Dict[str, Any] = {"updatedAt": datetime.datetime.now(datetime.timezone.utc)}
        if payload.price is not None:
            variant_update["price"] = payload.price
        if payload.discountedPrice is not None:
            variant_update["discountedPrice"] = payload.discountedPrice
        if payload.stock is not None:
            variant_update["stock"] = payload.stock
        await db.product_variants.update_many({"productId": product_id}, {"$set": variant_update})

    refreshed = await db.products.find_one({"id": product_id})
    enriched = await enrich_product(db, refreshed)
    return {
        "message": f"Product #{product_id} updated successfully",
        "product": enriched.model_dump(),
    }


# ------------------------------------------------------------------------------
# 5. DELETE PRODUCT (DELETE /api/products/{id}) [Admin Protected]
# ------------------------------------------------------------------------------
@router.delete("/{product_id}", response_model=Dict[str, Any])
async def delete_product(
    product_id: int,
    x_admin_key: Optional[str] = Header(None),
):
    """Deletes a product and its associated variants from MongoDB."""
    if x_admin_key != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=403, detail="Admin authorization required to delete products.")

    db = await get_database()
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail=f"Product #{product_id} not found.")

    await db.products.delete_one({"id": product_id})
    await db.product_variants.delete_many({"productId": product_id})

    return {
        "message": f"Product #{product_id} ('{existing.get('name')}') was deleted successfully.",
        "deletedId": product_id,
    }
