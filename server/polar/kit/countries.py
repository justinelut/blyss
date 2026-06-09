"""ISO 3166-1 alpha-2 country list.

Used by:
  - Backoffice ALLOWED_CREATOR_COUNTRIES picker (renders a grid of
    every country with checkboxes; ticked entries become the
    runtime-settings allowlist).
  - polar.organization.country_gate — resolves the live allowlist
    the AI review uses to gate creator approval.
  - Backoffice creator-waitlist analytics — maps stored codes to
    display names.

Codes are stored lowercased everywhere (matches Cloudflare's
`cf-ipcountry` header convention and the geo middleware). Names are
the English short form per ISO 3166-1. The list lives in code (not a
DB table) because it rarely changes and we want zero migrations.
"""

from __future__ import annotations

# (code, name) — lowercase ISO alpha-2 + English short name.
# Alphabetical by name. Populated in _ENTRIES batches below.
_ENTRIES: list[tuple[str, str]] = []
_ENTRIES += [
    ("af", "Afghanistan"),
    ("al", "Albania"),
    ("dz", "Algeria"),
    ("ad", "Andorra"),
    ("ao", "Angola"),
    ("ag", "Antigua and Barbuda"),
    ("ar", "Argentina"),
    ("am", "Armenia"),
    ("au", "Australia"),
    ("at", "Austria"),
    ("az", "Azerbaijan"),
    ("bs", "Bahamas"),
    ("bh", "Bahrain"),
    ("bd", "Bangladesh"),
    ("bb", "Barbados"),
    ("by", "Belarus"),
    ("be", "Belgium"),
    ("bz", "Belize"),
    ("bj", "Benin"),
    ("bt", "Bhutan"),
    ("bo", "Bolivia"),
    ("ba", "Bosnia and Herzegovina"),
    ("bw", "Botswana"),
    ("br", "Brazil"),
    ("bn", "Brunei"),
    ("bg", "Bulgaria"),
    ("bf", "Burkina Faso"),
    ("bi", "Burundi"),
    ("cv", "Cabo Verde"),
    ("kh", "Cambodia"),
    ("cm", "Cameroon"),
    ("ca", "Canada"),
    ("cf", "Central African Republic"),
    ("td", "Chad"),
    ("cl", "Chile"),
    ("cn", "China"),
    ("co", "Colombia"),
    ("km", "Comoros"),
    ("cg", "Congo"),
    ("cd", "Congo (DRC)"),
    ("cr", "Costa Rica"),
    ("ci", "Côte d'Ivoire"),
    ("hr", "Croatia"),
    ("cu", "Cuba"),
    ("cy", "Cyprus"),
    ("cz", "Czechia"),
    ("dk", "Denmark"),
    ("dj", "Djibouti"),
    ("dm", "Dominica"),
    ("do", "Dominican Republic"),
    ("ec", "Ecuador"),
    ("eg", "Egypt"),
    ("sv", "El Salvador"),
    ("gq", "Equatorial Guinea"),
    ("er", "Eritrea"),
    ("ee", "Estonia"),
    ("sz", "Eswatini"),
    ("et", "Ethiopia"),
    ("fj", "Fiji"),
    ("fi", "Finland"),
    ("fr", "France"),
]
_ENTRIES += [
    ("ga", "Gabon"),
    ("gm", "Gambia"),
    ("ge", "Georgia"),
    ("de", "Germany"),
    ("gh", "Ghana"),
    ("gr", "Greece"),
    ("gd", "Grenada"),
    ("gt", "Guatemala"),
    ("gn", "Guinea"),
    ("gw", "Guinea-Bissau"),
    ("gy", "Guyana"),
    ("ht", "Haiti"),
    ("hn", "Honduras"),
    ("hu", "Hungary"),
    ("is", "Iceland"),
    ("in", "India"),
    ("id", "Indonesia"),
    ("ir", "Iran"),
    ("iq", "Iraq"),
    ("ie", "Ireland"),
    ("il", "Israel"),
    ("it", "Italy"),
    ("jm", "Jamaica"),
    ("jp", "Japan"),
    ("jo", "Jordan"),
    ("kz", "Kazakhstan"),
    ("ke", "Kenya"),
    ("ki", "Kiribati"),
    ("kw", "Kuwait"),
    ("kg", "Kyrgyzstan"),
    ("la", "Laos"),
    ("lv", "Latvia"),
    ("lb", "Lebanon"),
    ("ls", "Lesotho"),
    ("lr", "Liberia"),
    ("ly", "Libya"),
    ("li", "Liechtenstein"),
    ("lt", "Lithuania"),
    ("lu", "Luxembourg"),
    ("mg", "Madagascar"),
    ("mw", "Malawi"),
    ("my", "Malaysia"),
    ("mv", "Maldives"),
    ("ml", "Mali"),
    ("mt", "Malta"),
    ("mh", "Marshall Islands"),
    ("mr", "Mauritania"),
    ("mu", "Mauritius"),
    ("mx", "Mexico"),
    ("fm", "Micronesia"),
    ("md", "Moldova"),
    ("mc", "Monaco"),
    ("mn", "Mongolia"),
    ("me", "Montenegro"),
    ("ma", "Morocco"),
    ("mz", "Mozambique"),
    ("mm", "Myanmar"),
]
_ENTRIES += [
    ("na", "Namibia"),
    ("nr", "Nauru"),
    ("np", "Nepal"),
    ("nl", "Netherlands"),
    ("nz", "New Zealand"),
    ("ni", "Nicaragua"),
    ("ne", "Niger"),
    ("ng", "Nigeria"),
    ("kp", "North Korea"),
    ("mk", "North Macedonia"),
    ("no", "Norway"),
    ("om", "Oman"),
    ("pk", "Pakistan"),
    ("pw", "Palau"),
    ("ps", "Palestine"),
    ("pa", "Panama"),
    ("pg", "Papua New Guinea"),
    ("py", "Paraguay"),
    ("pe", "Peru"),
    ("ph", "Philippines"),
    ("pl", "Poland"),
    ("pt", "Portugal"),
    ("qa", "Qatar"),
    ("ro", "Romania"),
    ("ru", "Russia"),
    ("rw", "Rwanda"),
    ("kn", "Saint Kitts and Nevis"),
    ("lc", "Saint Lucia"),
    ("vc", "Saint Vincent and the Grenadines"),
    ("ws", "Samoa"),
    ("sm", "San Marino"),
    ("st", "Sao Tome and Principe"),
    ("sa", "Saudi Arabia"),
    ("sn", "Senegal"),
    ("rs", "Serbia"),
    ("sc", "Seychelles"),
    ("sl", "Sierra Leone"),
    ("sg", "Singapore"),
    ("sk", "Slovakia"),
    ("si", "Slovenia"),
    ("sb", "Solomon Islands"),
    ("so", "Somalia"),
    ("za", "South Africa"),
    ("kr", "South Korea"),
    ("ss", "South Sudan"),
    ("es", "Spain"),
    ("lk", "Sri Lanka"),
    ("sd", "Sudan"),
    ("sr", "Suriname"),
    ("se", "Sweden"),
    ("ch", "Switzerland"),
    ("sy", "Syria"),
]
_ENTRIES += [
    ("tw", "Taiwan"),
    ("tj", "Tajikistan"),
    ("tz", "Tanzania"),
    ("th", "Thailand"),
    ("tl", "Timor-Leste"),
    ("tg", "Togo"),
    ("to", "Tonga"),
    ("tt", "Trinidad and Tobago"),
    ("tn", "Tunisia"),
    ("tr", "Türkiye"),
    ("tm", "Turkmenistan"),
    ("tv", "Tuvalu"),
    ("ug", "Uganda"),
    ("ua", "Ukraine"),
    ("ae", "United Arab Emirates"),
    ("gb", "United Kingdom"),
    ("us", "United States"),
    ("uy", "Uruguay"),
    ("uz", "Uzbekistan"),
    ("vu", "Vanuatu"),
    ("va", "Vatican City"),
    ("ve", "Venezuela"),
    ("vn", "Vietnam"),
    ("ye", "Yemen"),
    ("zm", "Zambia"),
    ("zw", "Zimbabwe"),
]

# Public immutable export — sorted by display name.
ISO_ALPHA2_COUNTRIES: tuple[tuple[str, str], ...] = tuple(
    sorted(_ENTRIES, key=lambda e: e[1])
)

_CODE_TO_NAME: dict[str, str] = {code: name for code, name in ISO_ALPHA2_COUNTRIES}
_VALID_CODES: frozenset[str] = frozenset(_CODE_TO_NAME.keys())


def is_valid_country_code(code: str | None) -> bool:
    """True if `code` is a known ISO alpha-2 code (case-insensitive)."""
    if not code:
        return False
    return code.strip().lower() in _VALID_CODES


def country_name(code: str | None) -> str | None:
    """English short name for an ISO alpha-2 code, or None if unknown."""
    if not code:
        return None
    return _CODE_TO_NAME.get(code.strip().lower())
