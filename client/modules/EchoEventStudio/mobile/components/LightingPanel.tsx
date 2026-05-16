import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as THREE from "three";
import { Presets } from "../lib/lightingPresets";
export default function LightingPanel({ scene }: { scene: THREE.Scene }) {
  const [active, setActive] = React.useState(0);
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {" "}
      <View style={styles.row}>
        {" "}
        {Presets.map((p, i) => (
          <Pressable
            key={p.name}
            style={[styles.btn, i === active && styles.active]}
            onPress={() => {
              p.apply(scene);
              setActive(i);
            }}
          >
            {" "}
            <Text style={styles.txt}>{p.name.split(" ")[0]}</Text>{" "}
          </Pressable>
        ))}{" "}
      </View>{" "}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { position: "absolute", top: 10, left: 10 },
  row: { flexDirection: "row", gap: 8 },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  active: { backgroundColor: "#00f0ff" },
  txt: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
