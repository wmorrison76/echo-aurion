import type { RequestHandler } from "express";

interface TableSection {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  efficiency: number;
  avgTurnover: number;
}

interface LayoutAnalysis {
  optimalCapacity: number;
  currentUtilization: number;
  totalRevenue: number;
  revenuePerSquareFoot: number;
  bottlenecks: string[];
  recommendations: string[];
  flowScore: number;
  sections: TableSection[];
  peakHours: string[];
  staffingNeeds: number;
}

const optimizeLayoutHandler: RequestHandler = async (req, res) => {
  try {
    const {
      layoutType = "restaurant",
      squareFeet = 2500,
      currentOccupancy = 72,
    } = req.body;

    const tableSections: TableSection[] = [
      {
        id: "section-1",
        name: "Main Dining",
        capacity: 40,
        currentOccupancy: 32,
        efficiency: 80,
        avgTurnover: 1.5,
      },
      {
        id: "section-2",
        name: "Bar Area",
        capacity: 20,
        currentOccupancy: 18,
        efficiency: 90,
        avgTurnover: 2.1,
      },
      {
        id: "section-3",
        name: "Patio",
        capacity: 30,
        currentOccupancy: 16,
        efficiency: 53,
        avgTurnover: 1.2,
      },
      {
        id: "section-4",
        name: "Private Events",
        capacity: 25,
        currentOccupancy: 0,
        efficiency: 0,
        avgTurnover: 0.8,
      },
    ];

    const totalCapacity = tableSections.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupancy = tableSections.reduce(
      (sum, s) => sum + s.currentOccupancy,
      0,
    );
    const utilization = Math.round((totalOccupancy / totalCapacity) * 100);

    const revenuePerCover = 65;
    const avgPartySize = 2.3;
    const totalRevenue = Math.round(totalOccupancy * revenuePerCover);
    const revenuePerSqft = Math.round(totalRevenue / (squareFeet / 100)) / 100;

    const bottlenecks: string[] = [];
    const recommendations: string[] = [];

    if (utilization < 65) {
      bottlenecks.push("Below optimal utilization - marketing needed");
      recommendations.push("Implement promotional dining programs");
      recommendations.push("Analyze pricing strategy for peak optimization");
    }

    if (tableSections[2].efficiency < 65) {
      bottlenecks.push(
        "Patio section underperforming - weather or location issues",
      );
      recommendations.push("Add covered area or heating lamps to patio");
      recommendations.push("Create patio-exclusive dining experiences");
    }

    if (totalCapacity - totalOccupancy > 20) {
      bottlenecks.push(
        "Excess capacity - consider flexible seating configuration",
      );
      recommendations.push(
        "Implement modular table arrangements for different party sizes",
      );
    }

    bottlenecks.push("Kitchen entrance creates congestion during service");
    bottlenecks.push("Bar area lacks proper waiting zone");
    bottlenecks.push("POS station too far from entry");

    recommendations.push("Relocate POS closer to entry for faster seating");
    recommendations.push("Add buffer zone at kitchen entrance");
    recommendations.push("Expand bar waiting area by 15%");

    const avgEfficiency = Math.round(
      tableSections.reduce((sum, s) => sum + s.efficiency, 0) /
        tableSections.length,
    );

    const staffingNeeds = Math.ceil(totalOccupancy / 6);

    const peakHours = ["12:00 PM - 1:30 PM", "6:00 PM - 8:30 PM"];

    const response: LayoutAnalysis = {
      optimalCapacity: totalCapacity,
      currentUtilization: utilization,
      totalRevenue,
      revenuePerSquareFoot: revenuePerSqft,
      bottlenecks,
      recommendations,
      flowScore: avgEfficiency,
      sections: tableSections,
      peakHours,
      staffingNeeds,
    };

    res.json(response);
  } catch (error) {
    console.error("[LAYOUT] Optimization error:", error);
    res.status(500).json({
      error: "Layout optimization failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default optimizeLayoutHandler;
