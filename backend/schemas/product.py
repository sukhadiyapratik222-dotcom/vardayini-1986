from typing import Optional, List
from pydantic import BaseModel, Field


class ProductVariantSchema(BaseModel):
    id: Optional[int] = None
    sku: Optional[str] = None
    weight: str = Field(..., description="Package size or weight, e.g. 250 g, 500 g, 1 kg")
    price: float = Field(..., ge=0, description="Standard retail price in INR")
    discountedPrice: Optional[float] = Field(None, ge=0, description="Promotional discount price in INR")
    stock: int = Field(default=50, ge=0, description="Available inventory stock")

    class Config:
        extra = "ignore"


class ProductBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150, description="Product title")
    slug: Optional[str] = Field(None, description="URL-friendly slug")
    categoryId: int = Field(default=1, description="Associated category ID")
    description: Optional[str] = Field(default="", description="Product description, ingredients or story")
    imageUrl: Optional[str] = Field(default="/images/kaju-katli.jpg", description="Relative or absolute image path")
    tags: Optional[str] = Field(default="", description="Comma-separated tags (e.g. bestseller,pure-ghee)")
    isFeatured: Optional[bool] = Field(default=False, description="Whether to feature on the homepage")


class ProductCreate(ProductBase):
    variants: Optional[List[ProductVariantSchema]] = Field(default_factory=list, description="List of packaging variants")
    # Convenience single-variant inputs for simple creation
    weight: Optional[str] = Field(default=None, description="Default package weight if variants list omitted")
    price: Optional[float] = Field(default=None, ge=0, description="Default price if variants list omitted")
    discountedPrice: Optional[float] = Field(default=None, ge=0)
    stock: Optional[int] = Field(default=50, ge=0)


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    categoryId: Optional[int] = None
    description: Optional[str] = None
    imageUrl: Optional[str] = None
    tags: Optional[str] = None
    isFeatured: Optional[bool] = None
    variants: Optional[List[ProductVariantSchema]] = None
    price: Optional[float] = None
    discountedPrice: Optional[float] = None
    stock: Optional[int] = None


class ProductResponse(ProductBase):
    id: int
    categoryName: Optional[str] = "Mithai"
    categorySlug: Optional[str] = "mithai"
    variants: List[ProductVariantSchema] = []
    price: Optional[float] = None
    discountedPrice: Optional[float] = None
    unitPrice: Optional[float] = None
    stock: Optional[int] = 0
    updatedAt: Optional[str] = None

    class Config:
        extra = "ignore"


class ProductListResponse(BaseModel):
    products: List[ProductResponse]
    total: int
    page: int = 1
    limit: int = 50
