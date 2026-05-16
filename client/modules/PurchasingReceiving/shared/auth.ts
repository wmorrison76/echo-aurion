export type Role = "Admin" | "Manager" | "Receiver" | "Chef" | "Finance";
export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: Role;
  outlet?: string | null;
}
