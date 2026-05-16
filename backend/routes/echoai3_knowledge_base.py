"""
EchoAi3 — Hospitality Industry Knowledge Base
================================================
Comprehensive operational intelligence covering:
- Hotels (Full-Service, Luxury, Resort)
- Casinos (Integrated Resort, Gaming Floor)
- Yachts (Superyacht, Charter, Cruise)
- Theme Parks (Major, Regional, Water Parks)

Every department, every KPI, every standard.
Sourced from: USALI, AHLEI, AGA, ISM, IAAPA, MLC 2006, STR benchmarks
"""
import os
from datetime import datetime, timezone
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional

import database

db = database.db
router = APIRouter(prefix="/api/echoai3/knowledge", tags=["echoai3-knowledge"])

_now = lambda: datetime.now(timezone.utc).isoformat()


# ═══════════════════════════════════════════════════════════════════
# HOTEL OPERATIONS KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════════════

HOTEL_KNOWLEDGE = {
    "front_office": {
        "department": "Front Office",
        "vertical": "hotel",
        "description": "Guest arrival, departure, reservations, concierge, bell services, PBX, night audit",
        "kpis": {
            "occupancy_rate": {"target": "70-85%", "luxury": "65-80%", "resort": "60-75%", "unit": "%"},
            "adr": {"target": "$150-300", "luxury": "$400-1200+", "resort": "$250-600", "unit": "USD", "description": "Average Daily Rate"},
            "revpar": {"target": "$105-255", "luxury": "$260-960+", "resort": "$150-450", "unit": "USD", "description": "Revenue Per Available Room"},
            "goppar": {"target": "$50-120", "luxury": "$150-500+", "unit": "USD", "description": "Gross Operating Profit Per Available Room"},
            "trevpar": {"target": "$180-400", "luxury": "$500-1500+", "unit": "USD", "description": "Total Revenue Per Available Room (includes F&B, spa, etc.)"},
            "check_in_time": {"target": "<3 min", "luxury": "<2 min", "unit": "minutes"},
            "check_out_time": {"target": "<2 min", "unit": "minutes"},
            "guest_satisfaction": {"target": ">85%", "luxury": ">90%", "unit": "%"},
            "online_review_score": {"target": ">4.2/5", "luxury": ">4.5/5"},
            "upsell_conversion": {"target": "15-25%", "unit": "%"},
            "direct_booking_ratio": {"target": ">40%", "luxury": ">50%", "unit": "%"},
            "cancellation_rate": {"target": "<15%", "unit": "%"},
            "no_show_rate": {"target": "<3%", "unit": "%"},
            "repeat_guest_rate": {"target": ">30%", "luxury": ">40%", "unit": "%"},
        },
        "cost_structure": {
            "labor_pct_of_dept_revenue": "25-35%",
            "ota_commission": "15-25%",
            "amenity_cost_per_room": "$2-15",
            "key_card_cost_per_unit": "$0.15-0.50",
        },
        "staffing": {
            "front_desk_ratio": "1 agent per 50-75 rooms",
            "concierge_ratio": "1 per 100-200 rooms (luxury: 1 per 50-80)",
            "bell_staff_ratio": "1 per 75-100 rooms",
            "night_audit": "1-2 per property",
        },
        "standards": [
            "Forbes Five-Star: Personalized greeting within 30 seconds of arrival",
            "AAA Diamond: Name recognition on second stay",
            "PCI-DSS compliance for all payment processing",
            "AHLA Safe Stay certification protocols",
            "Guest history profile maintained across stays (preferences, allergies, room type)",
        ],
    },
    "housekeeping": {
        "department": "Housekeeping",
        "vertical": "hotel",
        "description": "Room cleaning, turndown, laundry, public area maintenance, linen management",
        "kpis": {
            "rooms_cleaned_per_attendant": {"target": "14-16/day", "luxury": "10-12/day", "unit": "rooms/day"},
            "minutes_per_room": {"target": "25-30 min", "luxury": "35-45 min", "unit": "minutes"},
            "inspection_pass_rate": {"target": ">95%", "luxury": ">98%", "unit": "%"},
            "guest_complaint_rate": {"target": "<2%", "unit": "%"},
            "linen_par_level": {"target": "3x (3 sets per room)", "unit": "multiplier"},
            "laundry_cost_per_kg": {"target": "$0.50-1.20", "unit": "USD/kg"},
            "amenity_cost_per_occupied_room": {"target": "$3-8", "luxury": "$15-40", "unit": "USD"},
            "deep_clean_frequency": {"target": "Every 90 days", "luxury": "Every 60 days"},
            "turndown_completion_rate": {"target": ">98%", "luxury": "100%", "unit": "%"},
            "lost_and_found_return_rate": {"target": ">70%", "unit": "%"},
        },
        "cost_structure": {
            "labor_pct": "55-65% of department cost",
            "chemicals_supplies": "8-12%",
            "linen_replacement": "10-15%",
            "equipment_maintenance": "3-5%",
            "cost_per_occupied_room": "$18-35 (luxury: $45-80)",
        },
        "staffing": {
            "attendant_ratio": "1 per 14-16 rooms (luxury: 1 per 10-12)",
            "supervisor_ratio": "1 per 15-20 attendants",
            "laundry_attendant": "1 per 100-150 rooms",
            "public_area": "1 per 10,000-15,000 sq ft",
            "turndown_team": "1 per 20-25 rooms (luxury properties)",
        },
    },
    "food_and_beverage": {
        "department": "Food & Beverage",
        "vertical": "hotel",
        "description": "Restaurants, bars, room service, banquets, catering, minibar",
        "kpis": {
            "food_cost_pct": {"target": "25-32%", "fine_dining": "28-35%", "casual": "22-28%", "banquet": "20-28%"},
            "beverage_cost_pct": {"target": "18-24%", "spirits": "15-20%", "wine": "25-35%", "beer": "20-25%"},
            "labor_cost_pct": {"target": "28-35%", "fine_dining": "32-38%", "casual": "25-30%"},
            "prime_cost": {"target": "55-65%", "description": "Food + Beverage + Labor as % of revenue"},
            "revpash": {"target": "$15-45", "fine_dining": "$25-65", "unit": "USD", "description": "Revenue Per Available Seat Hour"},
            "check_average": {"target": "$45-120", "fine_dining": "$100-250+", "casual": "$25-55", "unit": "USD"},
            "table_turn_rate": {"target": "1.5-2.5 turns", "fine_dining": "1.0-1.5", "casual": "2.0-3.5"},
            "capture_rate": {"target": "55-75%", "luxury": "65-80%", "description": "% of hotel guests dining in-house"},
            "room_service_delivery_time": {"target": "<30 min", "luxury": "<25 min", "unit": "minutes"},
            "banquet_margin": {"target": "35-50%", "unit": "%"},
            "minibar_revenue_per_room": {"target": "$3-8/night", "luxury": "$10-25/night"},
            "waste_pct": {"target": "<2% of revenue", "description": "Total food waste as % of food revenue"},
            "inventory_turnover": {"target": "12-24x/year", "proteins": "15-20x", "produce": "20-30x", "dry_goods": "8-12x"},
            "comp_void_pct": {"target": "<1.5% of revenue"},
        },
        "cost_structure": {
            "food_cost": "25-32% of F&B revenue",
            "beverage_cost": "18-24% of beverage revenue",
            "labor": "28-35% of F&B revenue",
            "china_glass_silver": "2-4% of revenue (replacement)",
            "linen": "1-3%",
            "supplies": "2-4%",
            "music_entertainment": "0.5-2%",
        },
    },
    "revenue_management": {
        "department": "Revenue Management",
        "vertical": "hotel",
        "description": "Pricing strategy, demand forecasting, distribution, channel management",
        "kpis": {
            "revpar_index": {"target": ">100", "description": "Performance vs competitive set (100 = fair share)"},
            "adr_index": {"target": ">100"},
            "occupancy_index": {"target": ">100"},
            "booking_pace": {"description": "Reservations on books vs same time last year"},
            "displacement_analysis": {"description": "Revenue lost by accepting group vs transient"},
            "channel_cost": {"ota": "15-25%", "direct": "5-10%", "gds": "8-15%", "wholesale": "20-35%"},
            "length_of_stay": {"target": "2.0-3.5 nights", "resort": "3-7 nights"},
            "forecast_accuracy": {"target": ">90%", "description": "Predicted vs actual occupancy"},
        },
    },
    "engineering": {
        "department": "Engineering & Maintenance",
        "vertical": "hotel",
        "description": "HVAC, plumbing, electrical, preventive maintenance, energy management, FF&E",
        "kpis": {
            "energy_cost_per_room": {"target": "$5-15/night", "unit": "USD"},
            "water_cost_per_room": {"target": "$1-4/night", "unit": "USD"},
            "pm_completion_rate": {"target": ">95%", "description": "Preventive maintenance tasks completed on time"},
            "work_order_response_time": {"target": "<30 min for urgent, <4h standard"},
            "guest_room_downtime": {"target": "<1% of available rooms"},
            "equipment_uptime": {"target": ">99%"},
            "energy_per_sq_ft": {"target": "$2-5/sq ft/year"},
            "ffe_reserve": {"target": "4-6% of revenue", "description": "Furniture, Fixtures & Equipment replacement fund"},
            "capex_budget": {"target": "5-8% of revenue annually"},
        },
    },
    "sales_marketing": {
        "department": "Sales & Marketing",
        "vertical": "hotel",
        "description": "Group sales, corporate accounts, weddings, digital marketing, loyalty programs",
        "kpis": {
            "cost_per_acquisition": {"target": "$15-50", "unit": "USD"},
            "marketing_roi": {"target": "5:1 to 10:1"},
            "group_room_nights_pct": {"target": "20-40%", "unit": "%"},
            "wedding_lead_conversion": {"target": "15-25%", "unit": "%"},
            "loyalty_member_pct": {"target": ">40%", "unit": "%"},
            "social_media_engagement": {"target": ">3%", "unit": "%"},
            "email_open_rate": {"target": ">20%", "unit": "%"},
            "website_conversion": {"target": "2-5%", "unit": "%"},
        },
    },
    "spa_wellness": {
        "department": "Spa & Wellness",
        "vertical": "hotel",
        "description": "Massage, facials, body treatments, fitness, pool, salon",
        "kpis": {
            "revenue_per_treatment_room": {"target": "$300-800/day", "luxury": "$600-1500/day"},
            "therapist_utilization": {"target": "65-80%", "unit": "%"},
            "retail_capture_rate": {"target": "15-25%", "unit": "%"},
            "treatment_room_occupancy": {"target": "55-75%", "unit": "%"},
            "avg_treatment_value": {"target": "$120-250", "luxury": "$200-500+"},
            "product_cost_pct": {"target": "8-15%"},
            "labor_pct": {"target": "40-55% of spa revenue"},
            "guest_penetration": {"target": "15-30%", "description": "% of hotel guests using spa"},
        },
    },
    "security": {
        "department": "Security",
        "vertical": "hotel",
        "description": "Guest safety, asset protection, access control, surveillance, emergency response",
        "kpis": {
            "incident_rate": {"target": "<0.5 per 1000 room nights"},
            "response_time": {"target": "<3 min for emergency"},
            "camera_coverage": {"target": "100% of public areas"},
            "key_control_audit_pass": {"target": "100%"},
            "staff_background_check": {"target": "100% completion"},
        },
    },
    "human_resources": {
        "department": "Human Resources",
        "vertical": "hotel",
        "description": "Recruiting, training, benefits, labor relations, compliance",
        "kpis": {
            "turnover_rate": {"target": "<50%", "industry_avg": "73%", "luxury": "<35%"},
            "cost_per_hire": {"target": "$3,000-8,000"},
            "training_hours_per_employee": {"target": "40-80 hrs/year", "luxury": "80-120 hrs/year"},
            "employee_satisfaction": {"target": ">75%"},
            "time_to_fill": {"target": "<21 days"},
            "labor_cost_per_occupied_room": {"target": "$60-120", "luxury": "$120-250"},
            "benefits_cost_pct": {"target": "25-35% of base salary"},
        },
    },
    "finance_accounting": {
        "department": "Finance & Accounting",
        "vertical": "hotel",
        "description": "GL, AP/AR, payroll, budgeting, forecasting, audit, tax compliance",
        "kpis": {
            "gop_margin": {"target": "35-45%", "luxury": "30-40%", "description": "Gross Operating Profit margin"},
            "noi_margin": {"target": "25-35%", "description": "Net Operating Income margin"},
            "ebitda_margin": {"target": "30-40%", "luxury": "25-35%"},
            "labor_cost_ratio": {"target": "30-38% of total revenue"},
            "undistributed_expenses": {"target": "18-25% of revenue"},
            "management_fee": {"target": "3-5% of revenue + incentive"},
            "accounts_receivable_days": {"target": "<30 days"},
            "accounts_payable_days": {"target": "30-45 days"},
            "cash_flow_coverage": {"target": ">1.5x debt service"},
        },
        "standards": [
            "USALI 12th Edition — Uniform System of Accounts for the Lodging Industry",
            "GAAP/IFRS compliance for financial reporting",
            "SOX compliance for publicly traded companies",
            "Internal audit cycle: quarterly for high-risk areas",
        ],
    },
}


# ═══════════════════════════════════════════════════════════════════
# CASINO OPERATIONS KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════════════

CASINO_KNOWLEDGE = {
    "gaming_operations": {
        "department": "Gaming Operations",
        "vertical": "casino",
        "description": "Table games, slots, poker room, sportsbook, VIP gaming, pit management",
        "kpis": {
            "table_win_pct": {"target": "15-25%", "blackjack": "14-18%", "baccarat": "10-14%", "roulette": "20-25%", "craps": "12-16%"},
            "slot_win_pct": {"target": "6-12%", "penny": "10-15%", "high_limit": "4-8%", "description": "Theoretical hold percentage"},
            "drop_per_table": {"target": "$2,000-8,000/day", "high_limit": "$15,000-100,000+/day"},
            "slot_revenue_per_unit": {"target": "$150-400/day", "premium": "$500-1500/day"},
            "table_utilization": {"target": "60-80%", "unit": "%"},
            "slot_floor_utilization": {"target": "25-40%", "unit": "%", "description": "% of machines in active play"},
            "players_club_enrollment": {"target": "70-85% of active players"},
            "rated_play_pct": {"target": ">60%", "description": "% of play tracked via loyalty card"},
            "theoretical_win": {"description": "Expected casino revenue based on house edge and volume"},
            "actual_vs_theoretical": {"target": "±5%", "description": "Variance between actual and theoretical win"},
            "cost_per_gaming_position": {"target": "$150-350/day total operating cost"},
        },
        "cost_structure": {
            "gaming_tax": "6-40% varies by jurisdiction (NV: 6.75%, NJ: 8-15%, Macau: 39%)",
            "labor_pct": "20-30% of gaming revenue",
            "complimentaries": "15-25% of gaming revenue (rooms, food, entertainment)",
            "slot_maintenance": "$200-500/unit/year",
            "table_supplies": "$500-1500/table/year",
        },
        "staffing": {
            "dealer_per_table": "1 (plus rotation relief 1:4)",
            "pit_boss_ratio": "1 per 4-6 tables",
            "shift_manager": "1 per pit (8-12 tables)",
            "slot_tech_ratio": "1 per 200-300 machines",
            "surveillance": "1 per 20-30 tables or as regulated",
        },
        "regulations": [
            "Title 31 (Bank Secrecy Act) — CTRs for transactions >$10,000",
            "SARC (Suspicious Activity Report for Casinos) — unusual patterns",
            "Nevada Gaming Control Board / New Jersey DGE / state equivalents",
            "Minimum internal controls (MICs) per jurisdiction",
            "Random number generator (RNG) testing for electronic games",
            "Responsible gaming programs required by most jurisdictions",
        ],
    },
    "casino_cage": {
        "department": "Cage & Count",
        "vertical": "casino",
        "description": "Cash handling, chip inventory, credit operations, count room, fills/credits",
        "kpis": {
            "cage_variance": {"target": "<$500/shift", "description": "Cash over/short per shift"},
            "count_accuracy": {"target": "99.99%"},
            "chip_inventory_variance": {"target": "<0.01%"},
            "credit_issuance_time": {"target": "<10 min for verified players"},
            "marker_outstanding": {"description": "Total credit extended to players — track aging"},
            "bad_debt_pct": {"target": "<2% of credit extended"},
            "fills_per_table_per_shift": {"target": "2-4"},
        },
    },
    "casino_surveillance": {
        "department": "Surveillance",
        "vertical": "casino",
        "description": "24/7 monitoring, game protection, fraud detection, regulatory compliance",
        "kpis": {
            "camera_per_table": {"target": "2-3 cameras (overhead + side)"},
            "camera_per_slot_bank": {"target": "1 per 8-12 machines"},
            "incident_detection_rate": {"target": ">95%"},
            "footage_retention": {"target": "7-30 days (varies by jurisdiction, 7 for general, 30 for incidents)"},
            "false_positive_rate": {"target": "<10%"},
        },
    },
    "casino_hotel": {
        "department": "Casino Hotel Operations",
        "vertical": "casino",
        "description": "Complimentary rooms, rated player hosting, VIP suites, resort integration",
        "kpis": {
            "comp_room_pct": {"target": "30-60%", "description": "% of room nights given as comps"},
            "reinvestment_rate": {"target": "25-40%", "description": "% of gaming revenue returned to players as comps"},
            "cost_per_comp_room": {"target": "$40-80 (marginal cost, not rack rate)"},
            "vip_suite_utilization": {"target": ">70%"},
            "host_to_player_ratio": {"target": "1 host per 150-250 rated players"},
        },
    },
    "casino_fnb": {
        "department": "Casino F&B",
        "vertical": "casino",
        "description": "Restaurants, buffets, bars, quick-service, VIP dining, employee dining",
        "kpis": {
            "food_cost_pct": {"target": "22-30%", "buffet": "28-35%", "fine_dining": "30-38%", "quick_service": "18-24%"},
            "comp_fnb_pct": {"target": "40-65%", "description": "% of F&B revenue from casino comps"},
            "buffet_revenue_per_seat": {"target": "$40-80/seat/day"},
            "employee_meal_cost": {"target": "$3-6 per meal"},
            "24hr_outlet_labor_pct": {"target": "35-45%"},
        },
    },
    "casino_entertainment": {
        "department": "Entertainment",
        "vertical": "casino",
        "description": "Shows, concerts, nightclubs, lounges, special events",
        "kpis": {
            "show_attendance_rate": {"target": ">75% of capacity"},
            "ticket_revenue_per_seat": {"target": "$50-200 (headliner: $100-500+)"},
            "nightclub_revenue_per_sq_ft": {"target": "$300-800/sq ft/year"},
            "entertainment_cost_ratio": {"target": "15-30% of entertainment revenue"},
            "cross_sell_gaming_lift": {"target": "15-25% increase in gaming from event attendees"},
        },
    },
    "casino_marketing": {
        "department": "Casino Marketing",
        "vertical": "casino",
        "description": "Player development, loyalty programs, promotions, direct mail, digital",
        "kpis": {
            "player_acquisition_cost": {"target": "$100-500 per new rated player"},
            "player_lifetime_value": {"target": "$1,000-50,000+ (segment dependent)"},
            "direct_mail_response_rate": {"target": "8-15%"},
            "offer_redemption_rate": {"target": "20-35%"},
            "trip_frequency": {"target": "4-8 visits/year for core segment"},
            "wallet_share": {"target": ">40%", "description": "% of player's total gaming spend at your property"},
            "churn_rate": {"target": "<15% annually for top-tier players"},
            "promotional_cost_pct": {"target": "5-12% of net gaming revenue"},
        },
    },
}


# ═══════════════════════════════════════════════════════════════════
# YACHT OPERATIONS KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════════════

YACHT_KNOWLEDGE = {
    "bridge_navigation": {
        "department": "Bridge & Navigation",
        "vertical": "yacht",
        "description": "Captain, officers, navigation, safety, port operations, passage planning",
        "kpis": {
            "sea_time_vs_port_time": {"target": "60-70% at sea during charter"},
            "fuel_efficiency": {"target": "Varies by hull — track NM per gallon/liter"},
            "voyage_planning_compliance": {"target": "100%"},
            "safety_drill_frequency": {"target": "Weekly at minimum (SOLAS/MLC)"},
            "port_fee_budget": {"target": "Plan per itinerary — major ports $5K-50K+/day"},
            "ism_compliance": {"target": "100%", "description": "International Safety Management Code"},
        },
        "standards": [
            "STCW (Standards of Training, Certification and Watchkeeping)",
            "ISM Code compliance",
            "ISPS Code (International Ship and Port Facility Security)",
            "MLC 2006 (Maritime Labour Convention) for crew welfare",
            "Flag state requirements (Cayman Islands, Marshall Islands, etc.)",
            "Class society surveys (Lloyd's, DNV, Bureau Veritas)",
        ],
    },
    "interior": {
        "department": "Interior",
        "vertical": "yacht",
        "description": "Chief Stewardess, stewardesses, housekeeping, laundry, service, table setting",
        "kpis": {
            "guest_satisfaction": {"target": ">95%", "description": "Post-charter survey score"},
            "cabin_turnaround_time": {"target": "<45 min between charters"},
            "laundry_turnaround": {"target": "<2 hours for guest items"},
            "flower_budget_per_charter": {"target": "$500-5,000+ depending on yacht size"},
            "amenity_spend_per_guest_night": {"target": "$50-200+ (luxury superyacht)"},
            "interior_staff_ratio": {"target": "1 stew per 2-4 guests"},
        },
        "cost_structure": {
            "interior_supplies_annual": "$20,000-100,000+ depending on size",
            "linen_replacement": "$5,000-25,000/year",
            "cleaning_products": "$3,000-15,000/year",
            "guest_amenities": "$200-500/guest/charter",
        },
    },
    "galley": {
        "department": "Galley (Yacht Kitchen)",
        "vertical": "yacht",
        "description": "Chef, sous chef, provisioning, menu planning, dietary management, food safety",
        "kpis": {
            "food_cost_per_guest_day": {"target": "$75-200 (superyacht: $150-500+)"},
            "provisioning_budget_per_day": {"target": "$100-300/guest/day (all-inclusive)"},
            "dietary_accommodation": {"target": "100% — every guest preference met"},
            "waste_pct": {"target": "<5% of provisions (compact galley, no room for waste)"},
            "meal_service_timing": {"target": "On guest schedule — flexible 24/7"},
            "wine_cellar_value": {"target": "$10,000-500,000+ (managed inventory)"},
            "provisioning_lead_time": {"target": "48-72h before embarkation"},
        },
    },
    "deck": {
        "department": "Deck",
        "vertical": "yacht",
        "description": "Bosun, deckhands, water toys, tenders, maintenance, anchoring, docking",
        "kpis": {
            "water_toy_readiness": {"target": "100% — all toys deployable within 15 min"},
            "hull_condition": {"target": "Annual haul-out, monthly underwater inspection"},
            "paint_condition": {"target": "Refresh every 2-3 years"},
            "tender_fuel_budget": {"target": "$500-3,000/charter week"},
            "deck_maintenance_hours": {"target": "4-6 hours/day when not guest-facing"},
            "deck_staff_ratio": {"target": "1 per 15-20m of yacht length"},
        },
    },
    "engineering_yacht": {
        "department": "Engineering",
        "vertical": "yacht",
        "description": "Chief Engineer, systems maintenance, generators, HVAC, watermakers, AV",
        "kpis": {
            "generator_hours": {"target": "Track and maintain per manufacturer schedule"},
            "fuel_consumption": {"target": "Budget $50-200+/NM depending on yacht (fuel is 30-50% of operating cost)"},
            "watermaker_output": {"target": "Match guest + crew demand (200-500 liters/person/day)"},
            "hvac_efficiency": {"target": "Maintain cabin temperature within ±1°C of setpoint"},
            "annual_maintenance_budget": {"target": "10-15% of yacht value/year"},
            "dry_dock_frequency": {"target": "Every 2-3 years (5-year survey cycle)"},
            "class_survey_compliance": {"target": "100%"},
        },
        "cost_structure": {
            "fuel": "30-50% of annual operating budget",
            "maintenance_repair": "10-15% of yacht value/year",
            "insurance": "1-2% of yacht value/year",
            "crew_cost": "25-35% of operating budget",
            "port_fees_fuel": "15-25% of operating budget",
        },
    },
    "yacht_administration": {
        "department": "Administration & Management",
        "vertical": "yacht",
        "description": "Yacht management company, flag state compliance, crew management, charter brokerage",
        "kpis": {
            "charter_utilization": {"target": "12-20 weeks/year for charter yachts"},
            "charter_rate": {"target": "Typically 1/100th to 1/50th of yacht value per week"},
            "crew_retention": {"target": ">70% year-over-year", "description": "Industry average is ~50%"},
            "operating_cost_per_ft": {"target": "$1,000-2,500/ft/year for 100ft+ yachts"},
            "management_fee": {"target": "5-15% of operating costs or fixed fee"},
            "apa_budget_accuracy": {"target": "±10%", "description": "Advance Provisioning Allowance vs actual spend"},
        },
    },
}


# ═══════════════════════════════════════════════════════════════════
# THEME PARK OPERATIONS KNOWLEDGE BASE
# ═══════════════════════════════════════════════════════════════════

THEME_PARK_KNOWLEDGE = {
    "park_operations": {
        "department": "Park Operations",
        "vertical": "theme_park",
        "description": "Attractions, ride operations, guest flow, capacity management, queue management",
        "kpis": {
            "attendance": {"target": "Varies: regional 1-3M/year, major 10-30M/year, Disney/Universal 50-80M+"},
            "per_capita_spending": {"target": "$50-100 (regional), $100-200+ (major)", "description": "Total spend per visitor"},
            "ride_uptime": {"target": ">95%", "major_attractions": ">98%"},
            "throughput_per_hour": {"target": "800-2400 riders/hour depending on attraction type"},
            "average_wait_time": {"target": "<30 min (with virtual queue: <15 min)"},
            "guest_satisfaction": {"target": ">85%"},
            "capacity_utilization": {"target": "60-80% of max daily capacity"},
            "ride_incidents": {"target": "0 serious injuries (ASTM F24 compliance)"},
            "guest_complaint_rate": {"target": "<1 per 1000 guests"},
            "virtual_queue_adoption": {"target": ">40%"},
            "repeat_visitation": {"target": "Annual passholders 30-50% of attendance"},
        },
        "cost_structure": {
            "labor_pct": "40-55% of operating cost",
            "utilities": "5-8%",
            "maintenance": "8-15%",
            "insurance": "3-5%",
            "marketing": "8-12% of revenue",
        },
    },
    "park_fnb": {
        "department": "Theme Park F&B",
        "vertical": "theme_park",
        "description": "Quick-service restaurants, carts, kiosks, sit-down dining, character dining",
        "kpis": {
            "food_cost_pct": {"target": "20-28%", "quick_service": "18-25%", "sit_down": "25-32%"},
            "per_cap_food": {"target": "$20-40 per guest", "major_parks": "$30-60+"},
            "per_cap_beverage": {"target": "$8-15 per guest"},
            "revenue_per_sq_ft": {"target": "$500-1500/sq ft/year"},
            "transaction_time": {"target": "<3 min (quick-service)", "mobile_order": "<1 min pickup"},
            "mobile_order_pct": {"target": ">30%", "description": "% of orders placed via mobile app"},
            "food_safety_score": {"target": ">95/100"},
            "labor_pct": {"target": "25-35%"},
        },
    },
    "retail_merchandise": {
        "department": "Retail & Merchandise",
        "vertical": "theme_park",
        "description": "Gift shops, themed merchandise, character items, on-ride photos, personalization",
        "kpis": {
            "per_cap_merchandise": {"target": "$15-35 (regional), $25-60+ (major)"},
            "margin": {"target": "55-70%", "description": "Gross margin on merchandise"},
            "revenue_per_sq_ft": {"target": "$400-1200/sq ft/year"},
            "conversion_rate": {"target": "15-25%", "description": "% of guests making a purchase"},
            "inventory_turnover": {"target": "4-8x/year"},
            "shrinkage_rate": {"target": "<1.5%"},
            "on_ride_photo_conversion": {"target": "10-20%"},
        },
    },
    "park_entertainment": {
        "department": "Entertainment & Shows",
        "vertical": "theme_park",
        "description": "Parades, fireworks, character meets, live shows, seasonal events",
        "kpis": {
            "show_capacity_utilization": {"target": ">80%"},
            "character_wait_time": {"target": "<20 min"},
            "fireworks_cost_per_show": {"target": "$10,000-50,000+ (Disney: $50K-200K+)"},
            "seasonal_event_attendance_lift": {"target": "15-30%"},
            "performer_injury_rate": {"target": "<0.5%"},
            "entertainment_cost_pct": {"target": "8-15% of operating budget"},
        },
    },
    "park_security_safety": {
        "department": "Security & Safety",
        "vertical": "theme_park",
        "description": "Guest screening, surveillance, medical services, ride inspections, emergency response",
        "kpis": {
            "screening_throughput": {"target": ">500 guests/lane/hour"},
            "medical_response_time": {"target": "<4 min anywhere in park"},
            "ride_inspection_compliance": {"target": "100% daily pre-opening"},
            "evacuation_drill_frequency": {"target": "Quarterly minimum"},
            "astm_f24_compliance": {"target": "100%", "description": "Amusement ride safety standard"},
        },
    },
    "park_revenue": {
        "department": "Revenue & Ticketing",
        "vertical": "theme_park",
        "description": "Admission pricing, season passes, dynamic pricing, group sales, special events",
        "kpis": {
            "ticket_yield": {"target": "$50-120 (regional), $100-200+ (major)"},
            "season_pass_penetration": {"target": "30-50% of annual attendance"},
            "dynamic_pricing_lift": {"target": "5-15% revenue increase"},
            "group_sales_pct": {"target": "10-20% of attendance"},
            "ancillary_revenue_ratio": {"target": "1.5-2.5x admission revenue", "description": "Total revenue vs admission revenue"},
            "advance_purchase_pct": {"target": ">60%", "description": "% of tickets sold before arrival day"},
        },
    },
}


def _build_flat_knowledge() -> list:
    """Flatten all knowledge into a searchable list."""
    all_items = []
    for source, data in [
        ("hotel", HOTEL_KNOWLEDGE),
        ("casino", CASINO_KNOWLEDGE),
        ("yacht", YACHT_KNOWLEDGE),
        ("theme_park", THEME_PARK_KNOWLEDGE),
    ]:
        for key, dept in data.items():
            all_items.append({
                "vertical": source,
                "department_key": key,
                "department": dept.get("department", key),
                "description": dept.get("description", ""),
                "kpis": dept.get("kpis", {}),
                "cost_structure": dept.get("cost_structure", {}),
                "staffing": dept.get("staffing", {}),
                "standards": dept.get("standards", []),
                "regulations": dept.get("regulations", []),
            })
    return all_items


# ─── API Endpoints ───

@router.get("/verticals")
async def list_verticals():
    """List all industry verticals and their departments."""
    return {
        "verticals": {
            "hotel": {"departments": list(HOTEL_KNOWLEDGE.keys()), "count": len(HOTEL_KNOWLEDGE)},
            "casino": {"departments": list(CASINO_KNOWLEDGE.keys()), "count": len(CASINO_KNOWLEDGE)},
            "yacht": {"departments": list(YACHT_KNOWLEDGE.keys()), "count": len(YACHT_KNOWLEDGE)},
            "theme_park": {"departments": list(THEME_PARK_KNOWLEDGE.keys()), "count": len(THEME_PARK_KNOWLEDGE)},
        },
        "total_departments": len(HOTEL_KNOWLEDGE) + len(CASINO_KNOWLEDGE) + len(YACHT_KNOWLEDGE) + len(THEME_PARK_KNOWLEDGE),
    }


@router.get("/vertical/{vertical}")
async def get_vertical(vertical: str):
    """Get all departments for a specific vertical."""
    source = {"hotel": HOTEL_KNOWLEDGE, "casino": CASINO_KNOWLEDGE, "yacht": YACHT_KNOWLEDGE, "theme_park": THEME_PARK_KNOWLEDGE}.get(vertical)
    if not source:
        return {"error": f"Unknown vertical: {vertical}. Available: hotel, casino, yacht, theme_park"}
    return {"vertical": vertical, "departments": source}


@router.get("/department/{vertical}/{department}")
async def get_department(vertical: str, department: str):
    """Get detailed knowledge for a specific department."""
    source = {"hotel": HOTEL_KNOWLEDGE, "casino": CASINO_KNOWLEDGE, "yacht": YACHT_KNOWLEDGE, "theme_park": THEME_PARK_KNOWLEDGE}.get(vertical)
    if not source:
        return {"error": f"Unknown vertical: {vertical}"}
    dept = source.get(department)
    if not dept:
        return {"error": f"Unknown department: {department}. Available: {list(source.keys())}"}
    return dept


@router.get("/kpis/{vertical}")
async def get_kpis(vertical: str):
    """Get all KPIs for a vertical."""
    source = {"hotel": HOTEL_KNOWLEDGE, "casino": CASINO_KNOWLEDGE, "yacht": YACHT_KNOWLEDGE, "theme_park": THEME_PARK_KNOWLEDGE}.get(vertical)
    if not source:
        return {"error": f"Unknown vertical: {vertical}"}
    kpis = {}
    for key, dept in source.items():
        kpis[dept.get("department", key)] = dept.get("kpis", {})
    return {"vertical": vertical, "kpis": kpis}


@router.get("/search")
async def search_knowledge(q: str = Query("", description="Search query"), vertical: str = Query("", description="Filter by vertical")):
    """Search across all industry knowledge."""
    q_lower = q.lower()
    results = []
    all_items = _build_flat_knowledge()
    for item in all_items:
        if vertical and item["vertical"] != vertical:
            continue
        score = 0
        if q_lower in item["department"].lower(): score += 10
        if q_lower in item["description"].lower(): score += 5
        for kpi_key in item["kpis"]:
            if q_lower in kpi_key.lower(): score += 3
        for std in item.get("standards", []):
            if q_lower in std.lower(): score += 2
        if score > 0:
            results.append({**item, "relevance_score": score})
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return {"query": q, "results": results[:10], "total_results": len(results)}


@router.get("/benchmarks")
async def get_all_benchmarks():
    """Get industry benchmarks across all verticals for comparison."""
    return {
        "hotel_fnb": HOTEL_KNOWLEDGE["food_and_beverage"]["kpis"],
        "hotel_rooms": HOTEL_KNOWLEDGE["front_office"]["kpis"],
        "hotel_finance": HOTEL_KNOWLEDGE["finance_accounting"]["kpis"],
        "casino_gaming": CASINO_KNOWLEDGE["gaming_operations"]["kpis"],
        "casino_fnb": CASINO_KNOWLEDGE["casino_fnb"]["kpis"],
        "yacht_galley": YACHT_KNOWLEDGE["galley"]["kpis"],
        "theme_park_ops": THEME_PARK_KNOWLEDGE["park_operations"]["kpis"],
        "theme_park_fnb": THEME_PARK_KNOWLEDGE["park_fnb"]["kpis"],
    }


def get_knowledge_context(query: str) -> str:
    """Generate knowledge context for EchoAi3 orchestrator queries."""
    q = query.lower()
    context_parts = []

    # Determine which verticals are relevant
    verticals_to_check = []
    if any(w in q for w in ["hotel", "room", "front desk", "housekeeping", "concierge", "adr", "revpar", "occupancy", "goppar"]):
        verticals_to_check.append(("hotel", HOTEL_KNOWLEDGE))
    if any(w in q for w in ["casino", "gaming", "slot", "table game", "poker", "baccarat", "pit", "cage", "surveillance", "comp"]):
        verticals_to_check.append(("casino", CASINO_KNOWLEDGE))
    if any(w in q for w in ["yacht", "charter", "captain", "galley", "stewardess", "tender", "water toy", "superyacht", "maritime"]):
        verticals_to_check.append(("yacht", YACHT_KNOWLEDGE))
    if any(w in q for w in ["theme park", "park", "ride", "attraction", "roller coaster", "character", "firework", "parade", "season pass"]):
        verticals_to_check.append(("theme_park", THEME_PARK_KNOWLEDGE))

    # Always include relevant hospitality KPI context
    if any(w in q for w in ["benchmark", "industry", "standard", "compare", "best practice", "kpi", "target"]):
        verticals_to_check = [("hotel", HOTEL_KNOWLEDGE), ("casino", CASINO_KNOWLEDGE), ("yacht", YACHT_KNOWLEDGE), ("theme_park", THEME_PARK_KNOWLEDGE)]

    # If nothing specific, include hotel (default for resort operations)
    if not verticals_to_check:
        verticals_to_check.append(("hotel", HOTEL_KNOWLEDGE))

    for vert_name, vert_data in verticals_to_check:
        relevant_depts = []
        for key, dept in vert_data.items():
            score = 0
            dept_text = f"{dept.get('department','')} {dept.get('description','')}".lower()
            for word in q.split():
                if len(word) > 3 and word in dept_text:
                    score += 1
            for kpi_key in dept.get("kpis", {}):
                if any(w in kpi_key for w in q.split() if len(w) > 3):
                    score += 2
            if score > 0:
                relevant_depts.append((score, key, dept))

        relevant_depts.sort(key=lambda x: x[0], reverse=True)

        for _, key, dept in relevant_depts[:3]:
            kpi_text = []
            for kpi_name, kpi_data in list(dept.get("kpis", {}).items())[:8]:
                if isinstance(kpi_data, dict):
                    target = kpi_data.get("target", "N/A")
                    desc = kpi_data.get("description", "")
                    kpi_text.append(f"{kpi_name}: {target}" + (f" ({desc})" if desc else ""))
            if kpi_text:
                context_parts.append(
                    f"INDUSTRY KNOWLEDGE [{vert_name.upper()} — {dept.get('department',key)}]: "
                    f"{dept.get('description','')}. "
                    f"Key KPIs: {'; '.join(kpi_text)}."
                )

    return "\n\n".join(context_parts) if context_parts else ""
