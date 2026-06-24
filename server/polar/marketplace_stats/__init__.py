"""Public-facing marketplace aggregate stats.

A single read-only endpoint surfaces real DB counts for the homepage
hero strip + the creator-recruitment /start page. Numbers are real
(not faked, not cached for ages) — three cheap aggregate queries
costing well under 100ms total. Edge-cached for 5 minutes via the
HTTP `Cache-Control` header so the homepage doesn't re-query on
every paint.
"""
