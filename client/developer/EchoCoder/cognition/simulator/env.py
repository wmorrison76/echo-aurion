"""Synthetic kitchen environment used for rehearsal.

The environment models inventory consumption, staff workload, and guest demand.
It is intentionally lightweight so it can run inside CI or scheduled jobs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class StationState:
    name: str
    staff_on_shift: int
    capacity_per_hour: int
    backlog: int = 0


@dataclass
class InventoryState:
    sku: str
    on_hand: float
    par: float
    unit: str


@dataclass
class EventScenario:
    name: str
    demand_by_station: Dict[str, int]
    recipe_requirements: Dict[str, List[Tuple[str, float]]]


class KitchenSimulator:
    def __init__(self, stations: Dict[str, StationState], inventory: Dict[str, InventoryState]):
        self.stations = stations
        self.inventory = inventory

    def simulate(self, scenario: EventScenario) -> Dict[str, object]:
        coverage: Dict[str, float] = {}
        warnings: List[str] = []

        for station_name, demand in scenario.demand_by_station.items():
            station = self.stations.get(station_name)
            if not station:
                warnings.append(f"Missing station configuration for {station_name}")
                continue
            available_capacity = station.staff_on_shift * station.capacity_per_hour
            coverage[station_name] = min(1.0, available_capacity / max(1, demand))
            if coverage[station_name] < 0.75:
                warnings.append(f"Station {station_name} will only cover {coverage[station_name]:.0%} of demand")

        for recipe, ingredients in scenario.recipe_requirements.items():
            for sku, amount_needed in ingredients:
                stock = self.inventory.get(sku)
                if not stock:
                    warnings.append(f"Recipe {recipe} requires unknown SKU {sku}")
                    continue
                if stock.on_hand < amount_needed:
                    deficit = amount_needed - stock.on_hand
                    warnings.append(
                        f"Inventory warning: {sku} short by {deficit:.2f}{stock.unit} for recipe {recipe}"
                    )

        return {
            "coverage": coverage,
            "warnings": warnings,
            "recommendations": self._build_recommendations(warnings),
        }

    def _build_recommendations(self, warnings: List[str]) -> List[str]:
        recommendations: List[str] = []
        for warning in warnings:
            if "short by" in warning:
                sku = warning.split()[2]
                recommendations.append(f"Trigger replenishment workflow for {sku} via order-guide module.")
            elif "coverage" in warning:
                station = warning.split()[1]
                recommendations.append(
                    f"Consider reallocating staff or adjusting prep for station {station}."
                )
        return recommendations
