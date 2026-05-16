/**
 * List of EchoCoder files and directories that should NOT be overwritten during imports
 * This ensures the EchoCoder system remains functional and uncontaminated
 */

export const ECHOCODER_PROTECTED_PATHS = [
  // Core EchoCoder components
  /client\/components\/echo\//,
  /client\/components\/studio\//,
  /client\/core\/ai3\//,
  
  // EchoCoder pages
  /client\/pages\/Studio\.tsx/,
  /client\/pages\/EchoControls\.tsx/,
  /client\/pages\/Generated\.tsx/,
  /client\/pages\/AutomationPreview\.tsx/,
  /client\/pages\/EmbedEcho\.tsx/,
  /client\/pages\/Sandbox\.tsx/,
  /client\/pages\/StudioControlsDialog\.tsx/,
  /client\/pages\/StudioHospitalityOverview\.tsx/,
  
  // EchoCoder settings and admin
  /client\/pages\/Settings\.tsx/,
  /client\/pages\/LuccaDashboard\.tsx/,
  /client\/components\/site\/EchoAiLauncher\.tsx/,
  
  // Server routes for EchoCoder
  /server\/routes\/automation\.ts/,
  /server\/routes\/builder\.ts/,
  /server\/routes\/echo\.ts/,
  /server\/routes\/guard\.ts/,
  /server\/routes\/import\.ts/,
  /server\/routes\/zaro\.ts/,
  /server\/routes\/historian\.ts/,
  /server\/routes\/images\.ts/,
  /server\/routes\/planner\.ts/,
  /server\/routes\/tar\.ts/,
  
  // Automation system
  /automation\/runner\.ts/,
  /automation\/generated-tasks\.json/,
  
  // Cognition system
  /cognition\//,
  
  // EchoCoder libraries
  /client\/lib\/automation\.ts/,
  /client\/lib\/file-scanner\.ts/,
  /client\/lib\/guard-client\.ts/,
  /client\/lib\/planner-scaffold\.ts/,
  /client\/lib\/echo-script\.ts/,
  /client\/lib\/builder\.ts/,
  
  // Root app files
  /client\/App\.tsx/,
  /client\/global\.css/,
  /client\/vite-env\.d\.ts/,
  /client\/i18n\.tsx/,
  /client\/sidebar\.tsx/,
  
  // Server core
  /server\/index\.ts/,
  /server\/node-build\.ts/,
  /server\/zaro-lib\.ts/,
  
  // Config files (protected to prevent breaking build)
  /tsconfig\.json/,
  /vite\.config\./,
  /package\.json/,
  /pnpm-lock\.yaml/,
  /netlify\.toml/,
  /tailwind\.config\.ts/,
  /postcss\.config\.js/,
  
  // Shared utilities
  /shared\//,
  
  // Documentation and admin
  /docs\//,
  /AGENTS\.md/,
  /CLAUDE\.md/,
];

/**
 * Check if a file path is protected from import overwrite
 * @param filePath - The relative file path to check
 * @returns true if the file is protected, false otherwise
 */
export function isEchoCoderProtected(filePath: string): boolean {
  const normalizedPath = filePath.replace(/\\/g, "/");
  return ECHOCODER_PROTECTED_PATHS.some((pattern) =>
    pattern.test(normalizedPath)
  );
}

/**
 * Filter files to import, removing any protected EchoCoder files
 * @param files - List of files from import
 * @returns Filtered list of safe-to-import files
 */
export function filterProtectedFiles<T extends { path: string }>(
  files: T[]
): T[] {
  return files.filter((file) => !isEchoCoderProtected(file.path));
}
