export interface ConversionRule {
  from: string;
  to: string;
  factor: number;
}
export interface VendorProgram {
  name: string;
  vendors: string[];
}
export interface Settings {
  accountSetupMode: boolean;
  conversions: ConversionRule[];
  programs: VendorProgram[];
}
const KEY = "echo_settings";
function defaults(): Settings {
  return { accountSetupMode: false, conversions: [], programs: [] };
}
export const SettingsStore = {
  get(): Settings {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "");
      return { ...defaults(), ...(parsed || {}) };
    } catch {
      return defaults();
    }
  },
  save(s: Settings) {
    localStorage.setItem(KEY, JSON.stringify(s));
  },
  upsertConversion(rule: ConversionRule) {
    const s = SettingsStore.get();
    const idx = s.conversions.findIndex(
      (r) => r.from === rule.from && r.to === rule.to,
    );
    if (idx >= 0) s.conversions[idx] = rule;
    else s.conversions.push(rule);
    SettingsStore.save(s);
  },
  removeConversion(rule: ConversionRule) {
    const s = SettingsStore.get();
    s.conversions = s.conversions.filter(
      (r) => !(r.from === rule.from && r.to === rule.to),
    );
    SettingsStore.save(s);
  },
  setPrograms(programs: VendorProgram[]) {
    const s = SettingsStore.get();
    s.programs = programs;
    SettingsStore.save(s);
  },
};
