import { Router, Request, Response } from "express";
import ExcelJS from "exceljs";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Generate Excel template for data import
const generateTemplate = async (
  templateType: "ecosystem" | "roles" | "users" | "modules"
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();

  if (templateType === "ecosystem") {
    // Roles sheet
    const rolesSheet = workbook.addWorksheet("Roles");
    rolesSheet.columns = [
      { header: "Role ID", key: "id", width: 20 },
      { header: "Role Name", key: "name", width: 30 },
      { header: "Level (1-5)", key: "level", width: 15 },
      { header: "Description", key: "description", width: 40 },
    ];
    rolesSheet.addRows([
      {
        id: "EC",
        name: "Executive Committee",
        level: 5,
        description: "Highest level access",
      },
      { id: "DIRECTOR", name: "Director", level: 4, description: "" },
      { id: "MANAGER", name: "Manager", level: 3, description: "" },
    ]);

    // Users sheet
    const usersSheet = workbook.addWorksheet("Users");
    usersSheet.columns = [
      { header: "User ID", key: "userId", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Name", key: "name", width: 25 },
      { header: "Role ID", key: "roleId", width: 20 },
      { header: "Outlet ID", key: "outletId", width: 20 },
      { header: "Employment Type", key: "employmentType", width: 18 },
      { header: "Hourly Rate", key: "hourlyRate", width: 15 },
    ];
    usersSheet.addRows([
      {
        userId: "user-001",
        email: "chef@example.com",
        name: "John Doe",
        roleId: "EC",
        outletId: "outlet-1",
        employmentType: "Salaried",
        hourlyRate: null,
      },
      {
        userId: "user-002",
        email: "cook@example.com",
        name: "Jane Smith",
        roleId: "MANAGER",
        outletId: "outlet-1",
        employmentType: "Hourly",
        hourlyRate: 18.50,
      },
    ]);

    // Outlets sheet
    const outletsSheet = workbook.addWorksheet("Outlets");
    outletsSheet.columns = [
      { header: "Outlet ID", key: "id", width: 20 },
      { header: "Outlet Name", key: "name", width: 30 },
      { header: "Department", key: "department", width: 20 },
      { header: "Location", key: "location", width: 25 },
      { header: "Manager", key: "manager", width: 25 },
    ];
    outletsSheet.addRows([
      {
        id: "outlet-1",
        name: "Main Kitchen",
        department: "Culinary",
        location: "Building A",
        manager: "John Doe",
      },
    ]);

    // Modules sheet
    const modulesSheet = workbook.addWorksheet("Modules");
    modulesSheet.columns = [
      { header: "Module Key", key: "key", width: 20 },
      { header: "Module Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 20 },
      { header: "Route", key: "route", width: 25 },
      { header: "Enabled by Default", key: "enabledByDefault", width: 20 },
    ];
    modulesSheet.addRows([
      {
        key: "maestro_bqt",
        name: "Maestro BQT",
        category: "Events",
        route: "/maestro-bqt",
        enabledByDefault: true,
      },
    ]);

    // Permissions sheet
    const permSheet = workbook.addWorksheet("Permissions");
    permSheet.columns = [
      { header: "Role ID", key: "roleId", width: 20 },
      { header: "Module Key", key: "moduleKey", width: 20 },
      { header: "Can View", key: "canView", width: 15 },
      { header: "Can Use", key: "canUse", width: 15 },
      { header: "Can Configure", key: "canConfigure", width: 18 },
      { header: "Hide in Sidebar", key: "hideInSidebar", width: 18 },
    ];
    permSheet.addRows([
      {
        roleId: "EC",
        moduleKey: "maestro_bqt",
        canView: true,
        canUse: true,
        canConfigure: true,
        hideInSidebar: false,
      },
    ]);
  } else if (templateType === "roles") {
    // Roles-only template
    const rolesSheet = workbook.addWorksheet("Roles");
    rolesSheet.columns = [
      { header: "Role ID", key: "id", width: 20 },
      { header: "Role Name", key: "name", width: 30 },
      { header: "Level (1-5)", key: "level", width: 15 },
      { header: "Description", key: "description", width: 40 },
    ];
    rolesSheet.addRows([
      {
        id: "ROLE-001",
        name: "Example Role",
        level: 3,
        description: "Enter role description here",
      },
    ]);
  } else if (templateType === "users") {
    // Users-only template
    const usersSheet = workbook.addWorksheet("Users");
    usersSheet.columns = [
      { header: "User ID", key: "userId", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Name", key: "name", width: 25 },
      { header: "Role ID", key: "roleId", width: 20 },
      { header: "Outlet ID", key: "outletId", width: 20 },
      { header: "Employment Type", key: "employmentType", width: 18 },
      { header: "Hourly Rate", key: "hourlyRate", width: 15 },
    ];
    usersSheet.addRows([
      {
        userId: "USER-001",
        email: "example@company.com",
        name: "John Doe",
        roleId: "MANAGER",
        outletId: "outlet-1",
        employmentType: "Hourly",
        hourlyRate: 20.00,
      },
      {
        userId: "USER-002",
        email: "jane@company.com",
        name: "Jane Smith",
        roleId: "STAFF",
        outletId: "outlet-1",
        employmentType: "Salaried",
        hourlyRate: null,
      },
    ]);
  } else if (templateType === "modules") {
    // Modules-only template
    const modulesSheet = workbook.addWorksheet("Modules");
    modulesSheet.columns = [
      { header: "Module Key", key: "key", width: 20 },
      { header: "Module Name", key: "name", width: 30 },
      { header: "Category", key: "category", width: 20 },
      { header: "Route", key: "route", width: 25 },
      { header: "Enabled by Default", key: "enabledByDefault", width: 20 },
    ];
    modulesSheet.addRows([
      {
        key: "module_001",
        name: "Example Module",
        category: "Operations",
        route: "/module-path",
        enabledByDefault: true,
      },
    ]);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as Buffer;
};

// POST /api/excel-templates/download/:type
router.get("/download/:type", async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const validTypes = ["ecosystem", "roles", "users", "modules"];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: "Invalid template type",
        validTypes,
      });
    }

    const buffer = await generateTemplate(type as any);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="template-${type}-${Date.now()}.xlsx"`
    );
    res.send(buffer);
  } catch (error) {
    console.error("[EXCEL-TEMPLATES] Download error:", error);
    res.status(500).json({
      error: "Failed to generate template",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// POST /api/excel-templates/upload
router.post("/upload", async (req: Request, res: Response) => {
  try {
    const { file, type } = req.body;

    if (!file) {
      return res.status(400).json({
        error: "No file provided",
      });
    }

    // Decode base64 file
    const matches = file.match(/^data:[^;]*;base64,(.*)$|^(.*)$/);
    const base64Data = matches?.[1] || matches?.[2] || file;
    const buffer = Buffer.from(base64Data, "base64");

    // Parse Excel file
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const data: Record<string, any> = {};

    // Parse sheets based on template type
    workbook.worksheets.forEach((worksheet) => {
      const rows: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const rowData: Record<string, any> = {};
        row.eachCell((cell, colNumber) => {
          const headerRow = worksheet.getRow(1);
          const header = headerRow.getCell(colNumber).value;
          rowData[String(header)] = cell.value;
        });
        if (Object.values(rowData).some((v) => v !== null && v !== undefined)) {
          rows.push(rowData);
        }
      });
      data[worksheet.name] = rows;
    });

    res.status(200).json({
      success: true,
      message: "File uploaded and parsed successfully",
      data,
      id: uuidv4(),
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[EXCEL-TEMPLATES] Upload error:", error);
    res.status(500).json({
      error: "Failed to process template",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
