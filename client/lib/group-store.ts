import type { GroupBooking } from "@/../shared/types/group";

const KEY = "luccca.groups.v1";

function loadAll(): Record<string, GroupBooking> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, GroupBooking>) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

function uid(prefix = "grp") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function createGroup(
  input: Pick<GroupBooking, "groupName"> & Partial<GroupBooking>,
): GroupBooking {
  const now = new Date().toISOString();
  const group: GroupBooking = {
    groupId: uid("grp"),
    groupName: input.groupName,
    masterAccount: input.masterAccount,
    bookingOwner: input.bookingOwner,
    serviceManager: input.serviceManager,
    startDate: input.startDate,
    endDate: input.endDate,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  const all = loadAll();
  all[group.groupId] = group;
  saveAll(all);
  return group;
}

export function upsertGroup(group: GroupBooking): GroupBooking {
  const all = loadAll();
  all[group.groupId] = { ...group, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[group.groupId];
}

export function getGroup(groupId: string): GroupBooking | null {
  const all = loadAll();
  return all[groupId] ?? null;
}

export function listGroups(): GroupBooking[] {
  return Object.values(loadAll()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
