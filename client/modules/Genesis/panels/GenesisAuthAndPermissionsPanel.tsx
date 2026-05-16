/** * Genesis Auth & Permissions Panel (Phase 4) * User switching, role management, and permission matrix display */ import React, {
  useEffect,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { User, Team } from "@/../shared/types/genesis-permissions";
import {
  getCurrentUser,
  setCurrentUser,
  listUsers,
  listTeams,
  getUserPermissions,
} from "@/stores/genesisAuthStore";
import { DEFAULT_PERMISSION_MATRIX } from "@/lib/genesis/permissions/defaultMatrix";
import { getPermissionDescription } from "@/lib/genesis/permissions/permissionChecks";
export default function GenesisAuthAndPermissionsPanel() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUserState(user);
    const allUsers = listUsers();
    setUsers(allUsers);
    const allTeams = listTeams();
    setTeams(allTeams);
    if (user) {
      setSelectedUser(user.userId);
      setUserPermissions(getUserPermissions(user.userId));
    }
  }, []);
  const handleSwitchUser = (userId: string) => {
    if (setCurrentUser(userId)) {
      const user = getCurrentUser();
      setCurrentUserState(user);
      setSelectedUser(userId);
      setUserPermissions(getUserPermissions(userId));
    }
  };
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold text-foreground">
              {" "}
              Genesis Auth & Permissions{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              User management, role assignment, and permission matrix{" "}
            </div>{" "}
          </div>{" "}
          {currentUser && <Badge>{currentUser.role}</Badge>}{" "}
        </div>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <Tabs
        defaultValue="current"
        className="flex-1 flex flex-col overflow-hidden"
      >
        {" "}
        <TabsList className="flex-shrink-0 ml-4 mt-4 w-fit">
          {" "}
          <TabsTrigger value="current">Current User</TabsTrigger>{" "}
          <TabsTrigger value="switch">Switch User</TabsTrigger>{" "}
          <TabsTrigger value="matrix">Permission Matrix</TabsTrigger>{" "}
          <TabsTrigger value="teams">Teams</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Tab: Current User */}{" "}
        <TabsContent value="current" className="flex-1 overflow-auto p-4">
          {" "}
          {currentUser ? (
            <div className="space-y-4">
              {" "}
              <Card className="p-4 space-y-3">
                {" "}
                <h3 className="font-semibold">User Profile</h3>{" "}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {" "}
                  <div>
                    {" "}
                    <div className="text-foreground/70">User ID</div>{" "}
                    <div className="font-mono text-xs">
                      {" "}
                      {currentUser.userId}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <div className="text-foreground/70">Name</div>{" "}
                    <div>{currentUser.name}</div>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <div className="text-foreground/70">Role</div>{" "}
                    <Badge>{currentUser.role}</Badge>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <div className="text-foreground/70">Status</div>{" "}
                    <Badge
                      className={
                        currentUser.isActive
                          ? "bg-green-600/20 text-green-200"
                          : "bg-red-600/20 text-red-200"
                      }
                    >
                      {" "}
                      {currentUser.isActive ? "Active" : "Inactive"}{" "}
                    </Badge>{" "}
                  </div>{" "}
                  {currentUser.outletId && (
                    <div className="col-span-2">
                      {" "}
                      <div className="text-foreground/70">
                        {" "}
                        Outlet/Commissary{" "}
                      </div>{" "}
                      <div className="font-mono text-xs">
                        {" "}
                        {currentUser.outletId}{" "}
                      </div>{" "}
                    </div>
                  )}{" "}
                </div>{" "}
              </Card>{" "}
              <Card className="p-4">
                {" "}
                <h3 className="font-semibold mb-3">
                  {" "}
                  Permissions ({userPermissions.length}){" "}
                </h3>{" "}
                <div className="space-y-2">
                  {" "}
                  {userPermissions.length > 0 ? (
                    userPermissions.map((perm) => (
                      <div
                        key={perm}
                        className="flex items-start gap-2 p-2 bg-background/50 rounded text-xs"
                      >
                        {" "}
                        <div className="text-green-500 mt-0.5">✓</div>{" "}
                        <div>
                          {" "}
                          <div className="font-mono">{perm}</div>{" "}
                          <div className="text-foreground/70 text-xs">
                            {" "}
                            {getPermissionDescription(perm)}{" "}
                          </div>{" "}
                        </div>{" "}
                      </div>
                    ))
                  ) : (
                    <div className="text-foreground/70 text-sm">
                      {" "}
                      No permissions granted{" "}
                    </div>
                  )}{" "}
                </div>{" "}
              </Card>{" "}
            </div>
          ) : (
            <div className="text-center text-foreground/70 p-4">
              {" "}
              No user selected{" "}
            </div>
          )}{" "}
        </TabsContent>{" "}
        {/* Tab: Switch User */}{" "}
        <TabsContent value="switch" className="flex-1 overflow-auto p-4">
          {" "}
          <div className="space-y-2">
            {" "}
            <p className="text-sm text-foreground/70 mb-4">
              {" "}
              Select a user to switch to for testing RBAC:{" "}
            </p>{" "}
            {users.map((user) => (
              <Card
                key={user.userId}
                className={`p-3 cursor-pointer transition ${selectedUser === user.userId ? "bg-primary/20 border-primary/50" : "hover:bg-slate-700/20"}`}
                onClick={() => handleSwitchUser(user.userId)}
              >
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div>
                    {" "}
                    <div className="font-semibold text-sm">
                      {user.name}
                    </div>{" "}
                    <div className="text-xs text-foreground/70 mt-1">
                      {" "}
                      <div>{user.role}</div>{" "}
                      {user.outletId && <div>{user.outletId}</div>}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <Badge className="text-xs">
                      {" "}
                      {user.permissions.length} perms{" "}
                    </Badge>{" "}
                  </div>{" "}
                </div>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </TabsContent>{" "}
        {/* Tab: Permission Matrix */}{" "}
        <TabsContent value="matrix" className="flex-1 overflow-auto p-4">
          {" "}
          <div className="space-y-4">
            {" "}
            {Object.entries(DEFAULT_PERMISSION_MATRIX.roles).map(
              ([roleKey, roleConfig]) => (
                <Card key={roleKey} className="p-4">
                  {" "}
                  <h3 className="font-semibold mb-2">{roleConfig.name}</h3>{" "}
                  <p className="text-xs text-foreground/70 mb-3">
                    {" "}
                    {roleConfig.description}{" "}
                  </p>{" "}
                  <div className="space-y-1">
                    {" "}
                    {roleConfig.defaultPermissions.map((perm) => (
                      <div
                        key={perm}
                        className="text-xs p-1.5 bg-background/50 rounded flex items-start gap-2"
                      >
                        {" "}
                        <div className="text-green-500 mt-0.5">✓</div>{" "}
                        <div>
                          {" "}
                          <div className="font-mono">{perm}</div>{" "}
                          <div className="text-foreground/70">
                            {" "}
                            {getPermissionDescription(perm)}{" "}
                          </div>{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                  {roleConfig.outletIndependent && (
                    <div className="mt-2 text-xs text-blue-400">
                      {" "}
                      🌍 Outlet-independent (can access all outlets){" "}
                    </div>
                  )}{" "}
                </Card>
              ),
            )}{" "}
          </div>{" "}
        </TabsContent>{" "}
        {/* Tab: Teams */}{" "}
        <TabsContent value="teams" className="flex-1 overflow-auto p-4">
          {" "}
          <div className="space-y-3">
            {" "}
            {teams.length > 0 ? (
              teams.map((team) => (
                <Card key={team.teamId} className="p-4">
                  {" "}
                  <h3 className="font-semibold mb-2">{team.name}</h3>{" "}
                  {team.description && (
                    <p className="text-xs text-foreground/70 mb-2">
                      {" "}
                      {team.description}{" "}
                    </p>
                  )}{" "}
                  <div className="space-y-2">
                    {" "}
                    <div>
                      {" "}
                      <div className="text-xs text-foreground/70 mb-1">
                        {" "}
                        Members ({team.members.length}){" "}
                      </div>{" "}
                      <div className="flex flex-wrap gap-1">
                        {" "}
                        {team.members.map((memberId) => {
                          const member = users.find(
                            (u) => u.userId === memberId,
                          );
                          return (
                            <Badge key={memberId} className="text-xs">
                              {" "}
                              {member?.name || memberId}{" "}
                            </Badge>
                          );
                        })}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <div className="text-xs text-foreground/70 mb-1">
                        {" "}
                        Permissions ({team.permissions.length}){" "}
                      </div>{" "}
                      <div className="space-y-1">
                        {" "}
                        {team.permissions.map((perm) => (
                          <div
                            key={perm}
                            className="text-xs p-1 bg-background/50 rounded"
                          >
                            {" "}
                            {perm}{" "}
                          </div>
                        ))}{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </Card>
              ))
            ) : (
              <Card className="p-4 text-center text-foreground/70">
                {" "}
                No teams configured{" "}
              </Card>
            )}{" "}
          </div>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
