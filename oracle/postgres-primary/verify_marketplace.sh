#!/bin/bash
# Script to verify marketplace tables exist in PostgreSQL
# Run this on the PostgreSQL primary instance (100.114.146.100)

echo "================================================================================"
echo "MARKETPLACE TABLES VERIFICATION"
echo "================================================================================"
echo ""

echo "Checking which marketplace tables exist..."
echo ""

sudo -u postgres psql -d blyss << 'EOF'
\pset border 2
\pset format wrapped

SELECT
    table_name,
    (SELECT COUNT(*)
     FROM information_schema.columns
     WHERE table_name = t.table_name
     AND table_schema = 'public') as columns
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN (
    'products',
    'product_media',
    'product_reviews',
    'product_views',
    'product_categories',
    'cart_items',
    'product_cart_events',
    'wishlists',
    'orders',
    'order_items',
    'checkouts',
    'checkout_products',
    'discounts',
    'discount_redemptions',
    'discount_products',
    'license_keys',
    'license_key_activations'
)
ORDER BY table_name;

\echo ''
\echo '================================================================================'
\echo 'CART_ITEMS TABLE STRUCTURE'
\echo '================================================================================'

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cart_items'
AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''
\echo '================================================================================'
\echo 'ORDERS TABLE STRUCTURE'
\echo '================================================================================'

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''
\echo '================================================================================'
\echo 'ORDER_ITEMS TABLE STRUCTURE'
\echo '================================================================================'

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''
\echo '================================================================================'
\echo 'PRODUCTS TABLE STRUCTURE'
\echo '================================================================================'

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
AND table_schema = 'public'
ORDER BY ordinal_position;

\echo ''
\echo '================================================================================'
\echo 'VERIFICATION COMPLETE'
\echo '================================================================================'
EOF
