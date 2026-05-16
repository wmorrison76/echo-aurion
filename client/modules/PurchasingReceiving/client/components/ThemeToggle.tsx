import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const onChange = (val: boolean) => {
    setTheme(val ? "dark" : "light");
  };
  return (
    <div className={className}>
      {" "}
      <div className="flex items-center gap-2">
        {" "}
        <Switch id="theme" checked={isDark} onCheckedChange={onChange} />{" "}
        <Label htmlFor="theme" className="text-sm text-foreground">
          {isDark ? "Dark" : "Light"} mode
        </Label>{" "}
      </div>{" "}
    </div>
  );
}
