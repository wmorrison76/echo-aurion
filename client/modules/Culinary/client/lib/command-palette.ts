// Advanced command palette for navigation and actions

export type CommandCategory = 
  | "navigation"
  | "recipes"
  | "costing"
  | "suppliers"
  | "customers"
  | "orders"
  | "reports"
  | "settings"
  | "help";

export type CommandAction = 
  | "navigate"
  | "open"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "import"
  | "copy";

export type Command = {
  id: string;
  title: string;
  description?: string;
  category: CommandCategory;
  action: CommandAction;
  icon?: string;
  shortcut?: string;
  handler: () => void | Promise<void>;
  metadata?: Record<string, any>;
};

export type CommandGroup = {
  category: CommandCategory;
  label: string;
  commands: Command[];
};

class CommandPaletteManager {
  private commands: Map<string, Command> = new Map();
  private history: string[] = [];
  private maxHistorySize = 50;

  /**
   * Register a command
   */
  registerCommand(command: Command) {
    this.commands.set(command.id, command);
  }

  /**
   * Register multiple commands
   */
  registerCommands(commands: Command[]) {
    commands.forEach((cmd) => this.registerCommand(cmd));
  }

  /**
   * Get all commands grouped by category
   */
  getGroupedCommands(): CommandGroup[] {
    const categories: Record<CommandCategory, CommandGroup> = {
      navigation: { category: "navigation", label: "Navigation", commands: [] },
      recipes: { category: "recipes", label: "Recipes", commands: [] },
      costing: { category: "costing", label: "Costing", commands: [] },
      suppliers: { category: "suppliers", label: "Suppliers", commands: [] },
      customers: { category: "customers", label: "Customers", commands: [] },
      orders: { category: "orders", label: "Orders", commands: [] },
      reports: { category: "reports", label: "Reports", commands: [] },
      settings: { category: "settings", label: "Settings", commands: [] },
      help: { category: "help", label: "Help", commands: [] },
    };

    this.commands.forEach((cmd) => {
      categories[cmd.category].commands.push(cmd);
    });

    return Object.values(categories).filter((group) => group.commands.length > 0);
  }

  /**
   * Search commands
   */
  searchCommands(query: string): Command[] {
    const lowerQuery = query.toLowerCase();

    return Array.from(this.commands.values()).filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.id.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Execute command
   */
  async executeCommand(commandId: string): Promise<boolean> {
    const command = this.commands.get(commandId);

    if (!command) {
      console.error(`Command not found: ${commandId}`);
      return false;
    }

    try {
      await command.handler();
      this.addToHistory(commandId);
      return true;
    } catch (error) {
      console.error(`Error executing command ${commandId}:`, error);
      return false;
    }
  }

  /**
   * Get recent commands
   */
  getRecentCommands(limit: number = 10): Command[] {
    return this.history
      .slice(-limit)
      .reverse()
      .map((id) => this.commands.get(id))
      .filter(Boolean) as Command[];
  }

  /**
   * Get frequently used commands
   */
  getFrequentCommands(limit: number = 10): Command[] {
    const frequency: Record<string, number> = {};

    this.history.forEach((id) => {
      frequency[id] = (frequency[id] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => this.commands.get(id))
      .filter(Boolean) as Command[];
  }

  /**
   * Get command by shortcut
   */
  getCommandByShortcut(shortcut: string): Command | undefined {
    return Array.from(this.commands.values()).find(
      (cmd) => cmd.shortcut === shortcut,
    );
  }

  /**
   * Add to history
   */
  private addToHistory(commandId: string) {
    this.history.push(commandId);

    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Clear history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Get all commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}

export const commandPalette = new CommandPaletteManager();

/**
 * Default commands for recipe management
 */
export function registerDefaultRecipeCommands() {
  commandPalette.registerCommands([
    {
      id: "recipe.create",
      title: "Create New Recipe",
      description: "Create a new recipe from scratch",
      category: "recipes",
      action: "create",
      icon: "plus",
      shortcut: "Cmd+N",
      handler: () => {
        window.location.href = "/?tab=add-recipe";
      },
    },
    {
      id: "recipe.search",
      title: "Search Recipes",
      description: "Search for recipes",
      category: "recipes",
      action: "open",
      icon: "search",
      shortcut: "Cmd+/",
      handler: () => {
        window.location.href = "/?tab=search";
      },
    },
    {
      id: "recipe.import",
      title: "Import Recipe",
      description: "Import recipe from file",
      category: "recipes",
      action: "import",
      icon: "upload",
      handler: () => {
        console.log("Import recipe");
      },
    },
  ]);
}

/**
 * Default commands for supplier management
 */
export function registerDefaultSupplierCommands() {
  commandPalette.registerCommands([
    {
      id: "supplier.browse",
      title: "Browse Suppliers",
      description: "View all suppliers",
      category: "suppliers",
      action: "open",
      icon: "truck",
      shortcut: "Cmd+T",
      handler: () => {
        window.location.href = "/?tab=suppliers";
      },
    },
    {
      id: "supplier.order",
      title: "Create Purchase Order",
      description: "Create a new purchase order",
      category: "orders",
      action: "create",
      icon: "plus",
      handler: () => {
        console.log("Create order");
      },
    },
    {
      id: "supplier.sync",
      title: "Sync Supplier Prices",
      description: "Sync prices from all suppliers",
      category: "suppliers",
      action: "edit",
      icon: "refresh",
      handler: () => {
        console.log("Sync prices");
      },
    },
  ]);
}

/**
 * Default commands for customer management
 */
export function registerDefaultCustomerCommands() {
  commandPalette.registerCommands([
    {
      id: "customer.browse",
      title: "View Customers",
      description: "View all customer profiles",
      category: "customers",
      action: "open",
      icon: "users",
      shortcut: "Cmd+P",
      handler: () => {
        window.location.href = "/?tab=customer-service";
      },
    },
    {
      id: "customer.create",
      title: "Add Customer",
      description: "Create new customer profile",
      category: "customers",
      action: "create",
      icon: "plus",
      handler: () => {
        console.log("Add customer");
      },
    },
  ]);
}

/**
 * Default commands for costing
 */
export function registerDefaultCostingCommands() {
  commandPalette.registerCommands([
    {
      id: "costing.view",
      title: "View Costing",
      description: "View recipe costing analysis",
      category: "costing",
      action: "open",
      icon: "dollar",
      shortcut: "Cmd+$",
      handler: () => {
        window.location.href = "/?tab=plate-costing";
      },
    },
    {
      id: "costing.report",
      title: "Generate Costing Report",
      description: "Generate comprehensive costing report",
      category: "reports",
      action: "export",
      icon: "file",
      handler: () => {
        console.log("Generate report");
      },
    },
  ]);
}

/**
 * Default commands for waste tracking
 */
export function registerDefaultWasteCommands() {
  commandPalette.registerCommands([
    {
      id: "waste.view",
      title: "View Waste Tracking",
      description: "View waste analysis",
      category: "recipes",
      action: "open",
      icon: "trash",
      handler: () => {
        window.location.href = "/?tab=waste-tracking";
      },
    },
    {
      id: "waste.log",
      title: "Log Waste",
      description: "Record new waste entry",
      category: "recipes",
      action: "create",
      icon: "plus",
      handler: () => {
        console.log("Log waste");
      },
    },
  ]);
}

/**
 * Default commands for navigation
 */
export function registerDefaultNavigationCommands() {
  commandPalette.registerCommands([
    {
      id: "nav.home",
      title: "Go to Home",
      description: "Navigate to home",
      category: "navigation",
      action: "navigate",
      icon: "home",
      shortcut: "Cmd+H",
      handler: () => {
        window.location.href = "/";
      },
    },
    {
      id: "nav.settings",
      title: "Settings",
      description: "Open settings",
      category: "settings",
      action: "open",
      icon: "settings",
      shortcut: "Cmd+,",
      handler: () => {
        console.log("Open settings");
      },
    },
    {
      id: "nav.help",
      title: "Help & Support",
      description: "Open help documentation",
      category: "help",
      action: "open",
      icon: "help",
      shortcut: "Cmd+?",
      handler: () => {
        console.log("Open help");
      },
    },
  ]);
}

/**
 * Initialize all default commands
 */
export function initializeDefaultCommands() {
  registerDefaultRecipeCommands();
  registerDefaultSupplierCommands();
  registerDefaultCustomerCommands();
  registerDefaultCostingCommands();
  registerDefaultWasteCommands();
  registerDefaultNavigationCommands();
}
