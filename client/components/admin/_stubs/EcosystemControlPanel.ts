type ActionPermission = {
  id: string;
  rolePermissions?: Record<string, boolean>;
};

type AccessState = {
  actionPermissions: ActionPermission[];
};

const stubState: AccessState = {
  actionPermissions: [],
};

export function useAccessStore<T>(selector: (state: AccessState) => T): T {
  return selector(stubState);
}
