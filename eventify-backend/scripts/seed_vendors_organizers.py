"""
Seed >=15 vendors and >=15 organizers with complete profile fields for local/testing.

Run from the eventify-backend directory:
    python scripts/seed_vendors_organizers.py

Override the shared password:
    set SEED_USER_PASSWORD=YourStr0ng!Pass
    (PowerShell: $env:SEED_USER_PASSWORD = "YourStr0ng!Pass")

Requires: Flask app config and database (same .env as the backend). New users are
is_verified=True so /api/auth/login works without email verification.
"""
import json
import os
import sys

# When invoked from the repo root, add backend package root
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from app import create_app
from app.extensions import db
from app.models import User

# Matches signup policy: upper, digit, special, 8+ chars
DEFAULT_SEED_PASSWORD = "Eventify#Test1"
PASSWORD = os.environ.get("SEED_USER_PASSWORD", DEFAULT_SEED_PASSWORD).strip() or DEFAULT_SEED_PASSWORD

SEED_VENDORS = [
    {
        "name": "Aroma Bites Catering",
        "email": "vendor.catering.01@seed.eventify.test",
        "role": "vendor",
        "city": "Karachi",
        "phone": "+92 300 1001001",
        "category": "Catering",
    },
    {
        "name": "Golden Spoon Events Kitchen",
        "email": "vendor.catering.02@seed.eventify.test",
        "role": "vendor",
        "city": "Lahore",
        "phone": "+92 321 1001002",
        "category": "Catering",
    },
    {
        "name": "Lens & Light Studio",
        "email": "vendor.photo.01@seed.eventify.test",
        "role": "vendor",
        "city": "Islamabad",
        "phone": "+92 333 2002001",
        "category": "Photography",
    },
    {
        "name": "Cinematic Moments PK",
        "email": "vendor.photo.02@seed.eventify.test",
        "role": "vendor",
        "city": "Rawalpindi",
        "phone": "+92 345 2002002",
        "category": "Photography",
    },
    {
        "name": "Bloom & Vine Florals",
        "email": "vendor.floral.01@seed.eventify.test",
        "role": "vendor",
        "city": "Lahore",
        "phone": "+92 300 3003001",
        "category": "Floral & Decor",
    },
    {
        "name": "Elegant Stems Decor",
        "email": "vendor.floral.02@seed.eventify.test",
        "role": "vendor",
        "city": "Faisalabad",
        "phone": "+92 301 3003002",
        "category": "Floral & Decor",
    },
    {
        "name": "SonicWave DJ & AV",
        "email": "vendor.dj.01@seed.eventify.test",
        "role": "vendor",
        "city": "Karachi",
        "phone": "+92 300 4004001",
        "category": "DJ & Sound",
    },
    {
        "name": "Bassline Audio Rentals",
        "email": "vendor.dj.02@seed.eventify.test",
        "role": "vendor",
        "city": "Multan",
        "phone": "+92 310 4004002",
        "category": "DJ & Sound",
    },
    {
        "name": "Velvet Drape Rentals",
        "email": "vendor.venue.01@seed.eventify.test",
        "role": "vendor",
        "city": "Islamabad",
        "phone": "+92 300 5005001",
        "category": "Venue & Staging",
    },
    {
        "name": "Grand Hall Furnishers",
        "email": "vendor.venue.02@seed.eventify.test",
        "role": "vendor",
        "city": "Lahore",
        "phone": "+92 322 5005002",
        "category": "Venue & Staging",
    },
    {
        "name": "Studio Glam Makeup",
        "email": "vendor.beauty.01@seed.eventify.test",
        "role": "vendor",
        "city": "Karachi",
        "phone": "+92 300 6006001",
        "category": "Beauty & Styling",
    },
    {
        "name": "Bridal Artistry by Sarah",
        "email": "vendor.beauty.02@seed.eventify.test",
        "role": "vendor",
        "city": "Lahore",
        "phone": "+92 321 6006002",
        "category": "Beauty & Styling",
    },
    {
        "name": "Confectionery & Co. Cakes",
        "email": "vendor.cakes.01@seed.eventify.test",
        "role": "vendor",
        "city": "Islamabad",
        "phone": "+92 300 7007001",
        "category": "Cakes & Desserts",
    },
    {
        "name": "Sugar Loom Patisserie",
        "email": "vendor.cakes.02@seed.eventify.test",
        "role": "vendor",
        "city": "Lahore",
        "phone": "+92 304 7007002",
        "category": "Cakes & Desserts",
    },
    {
        "name": "Onyx Security Services",
        "email": "vendor.security.01@seed.eventify.test",
        "role": "vendor",
        "city": "Karachi",
        "phone": "+92 300 8008001",
        "category": "Security & Ushers",
    },
    {
        "name": "CityShield Event Staff",
        "email": "vendor.security.02@seed.eventify.test",
        "role": "vendor",
        "city": "Hyderabad",
        "phone": "+92 315 8008002",
        "category": "Security & Ushers",
    },
]

SEED_ORGANIZERS = [
    {
        "name": "Nimra Hassan — Wedding Coordination",
        "email": "org.wedding.01@seed.eventify.test",
        "role": "organizer",
        "city": "Lahore",
        "phone": "+92 300 9009001",
        "category": "Weddings",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Full planning, vendor coordination, day-of run sheet. 6–8 week minimum lead time."
        ),
    },
    {
        "name": "Omar Siddiqui Events",
        "email": "org.corporate.01@seed.eventify.test",
        "role": "organizer",
        "city": "Karachi",
        "phone": "+92 321 9009002",
        "category": "Corporate",
        "organizer_availability": "limited",
        "organizer_package_summary": (
            "Product launches, town halls, awards nights. A/V coordination and run-of-show management."
        ),
    },
    {
        "name": "Hira Malik Occasions",
        "email": "org.wedding.02@seed.eventify.test",
        "role": "organizer",
        "city": "Islamabad",
        "phone": "+92 300 9009003",
        "category": "Weddings",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Décor-led planning with in-house vendor shortlists and budget tracking."
        ),
    },
    {
        "name": "Blueprint Experiences",
        "email": "org.corporate.02@seed.eventify.test",
        "role": "organizer",
        "city": "Lahore",
        "phone": "+92 345 9009004",
        "category": "Corporate",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Conferences up to 400 guests; registration, staging, and sponsor activations."
        ),
    },
    {
        "name": "Ayesha Tariq Soirées",
        "email": "org.social.01@seed.eventify.test",
        "role": "organizer",
        "city": "Rawalpindi",
        "phone": "+92 300 9009005",
        "category": "Private parties",
        "organizer_availability": "unavailable",
        "organizer_package_summary": (
            "Milestones, engagement dinners, and intimate receptions (currently booked 8+ weeks out)."
        ),
    },
    {
        "name": "Catalyst Conferences",
        "email": "org.edu.01@seed.eventify.test",
        "role": "organizer",
        "city": "Lahore",
        "phone": "+92 301 9009006",
        "category": "Education & NGOs",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Workshops, seminars, and non-profit galas; volunteer coordination and donor seating plans."
        ),
    },
    {
        "name": "Marquee Moments",
        "email": "org.wedding.03@seed.eventify.test",
        "role": "organizer",
        "city": "Faisalabad",
        "phone": "+92 320 9009007",
        "category": "Weddings",
        "organizer_availability": "limited",
        "organizer_package_summary": (
            "Barat / walima day coordination, rukhsati timing, and vendor roster management."
        ),
    },
    {
        "name": "Pulse Event Lab",
        "email": "org.mixed.01@seed.eventify.test",
        "role": "organizer",
        "city": "Karachi",
        "phone": "+92 300 9009008",
        "category": "Mixed formats",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "From fashion showcases to pop-up retail; lighting design partners on speed dial."
        ),
    },
    {
        "name": "Serene Solemnities",
        "email": "org.cultural.01@seed.eventify.test",
        "role": "organizer",
        "city": "Multan",
        "phone": "+92 333 9009009",
        "category": "Cultural & religious",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Community gatherings and cultural programs; multi-language MC coordination."
        ),
    },
    {
        "name": "Altitude Adventures PK",
        "email": "org.outdoor.01@seed.eventify.test",
        "role": "organizer",
        "city": "Islamabad",
        "phone": "+92 300 9009010",
        "category": "Outdoor & retreats",
        "organizer_availability": "limited",
        "organizer_package_summary": (
            "Retreats and team off-sites: permits, transport, and weather contingency playbooks."
        ),
    },
    {
        "name": "Fiesta Kids Parties",
        "email": "org.kids.01@seed.eventify.test",
        "role": "organizer",
        "city": "Lahore",
        "phone": "+92 300 9009011",
        "category": "Kids & family",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Themed birthdays and school fairs; vetted entertainers and allergy-aware catering briefs."
        ),
    },
    {
        "name": "Gala & Giving",
        "email": "org.fund.01@seed.eventify.test",
        "role": "organizer",
        "city": "Karachi",
        "phone": "+92 321 9009012",
        "category": "Fundraising",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Charity dinners, silent auctions, and pledge night logistics."
        ),
    },
    {
        "name": "Niche Notables",
        "email": "org.boutique.01@seed.eventify.test",
        "role": "organizer",
        "city": "Lahore",
        "phone": "+92 300 9009013",
        "category": "Boutique & luxury",
        "organizer_availability": "limited",
        "organizer_package_summary": (
            "High-touch guest list management, VIP arrivals, and white-glove on-site team."
        ),
    },
    {
        "name": "Harbor & Hive Collective",
        "email": "org.mixed.02@seed.eventify.test",
        "role": "organizer",
        "city": "Gwadar",
        "phone": "+92 300 9009014",
        "category": "Mixed formats",
        "organizer_availability": "unavailable",
        "organizer_package_summary": (
            "Regional activations; advance site visits and logistics heavy programs."
        ),
    },
    {
        "name": "Rhythm & Rituals",
        "email": "org.music.01@seed.eventify.test",
        "role": "organizer",
        "city": "Lahore",
        "phone": "+92 304 9009015",
        "category": "Music & live shows",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Concert run-of-show, artist green rooms, and crowd control liaising with security."
        ),
    },
    {
        "name": "Summit Side Events",
        "email": "org.corporate.03@seed.eventify.test",
        "role": "organizer",
        "city": "Islamabad",
        "phone": "+92 300 9009016",
        "category": "Corporate",
        "organizer_availability": "available",
        "organizer_package_summary": (
            "Side sessions and C-suite roundtables at large conventions; NDAs and sign-in tracking."
        ),
    },
]

assert len(SEED_VENDORS) >= 15
assert len(SEED_ORGANIZERS) >= 15


def upsert_user_row(spec: dict) -> tuple[str, str, str]:
    email = spec["email"].strip().lower()
    existing = User.query.filter_by(email=email).first()
    if existing:
        return email, spec["role"], "skipped"

    u = User(
        name=spec["name"],
        email=email,
        role=spec["role"],
        city=spec.get("city"),
        phone=spec.get("phone"),
        category=spec.get("category"),
        is_verified=True,
        is_active=True,
    )
    if spec["role"] == "organizer":
        u.organizer_availability = spec.get("organizer_availability", "available")
        u.organizer_package_summary = spec.get("organizer_package_summary")
    u.set_password(PASSWORD)
    db.session.add(u)
    return email, spec["role"], "created"


def main() -> None:
    app = create_app()
    with app.app_context():
        db.create_all()
        log = []
        for spec in SEED_VENDORS + SEED_ORGANIZERS:
            email, role, status = upsert_user_row(spec)
            log.append(
                {
                    "email": email,
                    "role": role,
                    "name": spec["name"],
                    "status": status,
                }
            )
        db.session.commit()

        print("Eventify seed: vendors + organizers")
        print(f"Shared password (all newly created users): {PASSWORD}\n")
        print("Log in with email (not a separate username) + password above.\n")

        created = [r for r in log if r["status"] == "created"]
        skipped = [r for r in log if r["status"] == "skipped"]
        for r in created:
            print(f"  [NEW]  {r['role']:<9}  {r['email']}")
        for r in skipped:
            print(f"  [skip] {r['role']:<9}  {r['email']}  (already exists)")

        print()
        if created:
            print("Credentials (new users only):")
            for r in created:
                print(f"  {r['email']}\t{PASSWORD}")

        # Portable dump (stdout only; avoid writing passwords to disk in repo)
        if os.environ.get("SEED_PRINT_JSON") == "1":
            print("\n--- JSON (export / other systems) ---")
            print(
                json.dumps(
                    {
                        "password": PASSWORD,
                        "vendors": SEED_VENDORS,
                        "organizers": SEED_ORGANIZERS,
                    },
                    indent=2,
                    ensure_ascii=False,
                )
            )

        if not created and skipped:
            print(
                "\nAll seed emails already present; no new users. Re-run after DB reset or change emails in SEED_* lists."
            )


if __name__ == "__main__":
    main()
