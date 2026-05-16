import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Card, Text, Button, List, Divider } from "react-native-paper";
import { useAuth } from "../../client/context/AuthContext";
export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  return (
    <ScrollView style={styles.container}>
      {" "}
      <Card style={styles.profileCard}>
        {" "}
        <Card.Content>
          {" "}
          <View style={styles.avatarContainer}>
            {" "}
            <View style={styles.avatar}>
              {" "}
              <Text style={styles.avatarText}>
                {" "}
                {user?.username?.charAt(0).toUpperCase()}{" "}
              </Text>{" "}
            </View>{" "}
          </View>{" "}
          <Text variant="titleLarge" style={styles.name}>
            {" "}
            {user?.username}{" "}
          </Text>{" "}
          <Text variant="bodyMedium" style={styles.email}>
            {" "}
            {user?.email}{" "}
          </Text>{" "}
          <Text variant="labelSmall" style={styles.role}>
            {" "}
            {user?.role.toUpperCase()}{" "}
          </Text>{" "}
        </Card.Content>{" "}
      </Card>{" "}
      <Card style={styles.sectionCard}>
        {" "}
        <Card.Title title="Account Settings" />{" "}
        <List.Item title="Email" description={user?.email} /> <Divider />{" "}
        <List.Item title="Organization" description="Your Org Name" />{" "}
        <Divider /> <List.Item title="Role" description={user?.role} />{" "}
      </Card>{" "}
      <Card style={styles.sectionCard}>
        {" "}
        <Card.Title title="Preferences" />{" "}
        <List.Item
          title="Theme"
          description="Light"
          right={() => <List.Icon icon="chevron-right" />}
        />{" "}
        <Divider />{" "}
        <List.Item
          title="Notifications"
          description="Enabled"
          right={() => <List.Icon icon="chevron-right" />}
        />{" "}
        <Divider />{" "}
        <List.Item
          title="Language"
          description="English"
          right={() => <List.Icon icon="chevron-right" />}
        />{" "}
      </Card>{" "}
      <Card style={styles.sectionCard}>
        {" "}
        <Card.Title title="Help & Support" />{" "}
        <List.Item
          title="Documentation"
          right={() => <List.Icon icon="chevron-right" />}
        />{" "}
        <Divider />{" "}
        <List.Item
          title="Contact Support"
          right={() => <List.Icon icon="chevron-right" />}
        />{" "}
        <Divider />{" "}
        <List.Item
          title="About"
          right={() => <List.Icon icon="chevron-right" />}
        />{" "}
      </Card>{" "}
      <View style={styles.buttonContainer}>
        {" "}
        <Button
          mode="contained"
          onPress={signOut}
          style={styles.signOutButton}
          textColor="#fff"
        >
          {" "}
          Sign Out{" "}
        </Button>{" "}
      </View>{" "}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  profileCard: { margin: 16, marginBottom: 12 },
  avatarContainer: { alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "#fff" },
  name: { textAlign: "center", marginBottom: 4 },
  email: { textAlign: "center", color: "#64748b", marginBottom: 8 },
  role: { textAlign: "center", color: "#0ea5e9", fontWeight: "bold" },
  sectionCard: { marginHorizontal: 16, marginBottom: 12 },
  buttonContainer: { padding: 16 },
  signOutButton: { backgroundColor: "#ef4444" },
});
