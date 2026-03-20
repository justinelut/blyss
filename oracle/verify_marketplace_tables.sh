#!/bin/bash
# Script to verify marketplace tables exist in PostgreSQL

echo "Connecting to PostgreSQL to verify marketplace tables..."
echo ""

sudo -u postgres psql -d blyss -c "
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'products',
    'product_media',
    'product_reviews',
    'product_views',
    'cart_items',
    'product_cart_events',
    'wishlists',
    'orders',
    'order_items',
    'checkouts',
    'discounts',
    'discount_redemptions',
    'license_keys',
    'license_key_activations'
)
ORDER BY table_name;
"

echo ""
echo "Checking for cart_items table specifically..."
sudo -u postgres psql -d blyss -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cart_items'
ORDER BY ordinal_position;
"

echo ""
echo "Checking for orders table..."
sudo -u postgres psql -d blyss -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
"

echo ""
echo "Checking for products table..."
sudo -u postgres psql -d blyss -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
"
