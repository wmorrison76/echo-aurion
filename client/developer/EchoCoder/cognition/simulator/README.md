# Kitchen Simulator

The simulator models staffing capacity and inventory sufficiency for rehearsal scenarios. Use it to validate Echo’s automation plans before enabling them in production.

```python
from cognition.simulator.env import KitchenSimulator, StationState, InventoryState, EventScenario

sim = KitchenSimulator(
    stations={"dessert": StationState("dessert", staff_on_shift=2, capacity_per_hour=45)},
    inventory={"CREME-CREAM": InventoryState("CREME-CREAM", on_hand=18, par=24, unit="qt")},
)

scenario = EventScenario(
    name="Holiday Banquet",
    demand_by_station={"dessert": 80},
    recipe_requirements={
        "creme-brulee": [("CREME-CREAM", 20.0)],
    },
)

report = sim.simulate(scenario)
```

The resulting report indicates coverage ratios, warnings, and recommended follow-up actions.
