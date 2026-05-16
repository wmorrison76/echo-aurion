-- Migration 027: IoT Table RLS Policies
-- Enforces multi-tenant data isolation for all IoT tables

-- ============================================================================
-- IOT_DEVICES RLS
-- ============================================================================
ALTER TABLE iot_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY iot_devices_select_policy ON iot_devices FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY iot_devices_insert_policy ON iot_devices FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY iot_devices_update_policy ON iot_devices FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY iot_devices_delete_policy ON iot_devices FOR DELETE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- RFID_TAGS RLS
-- ============================================================================
ALTER TABLE rfid_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY rfid_tags_select_policy ON rfid_tags FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY rfid_tags_insert_policy ON rfid_tags FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY rfid_tags_update_policy ON rfid_tags FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- TAG_PRODUCT_ASSIGNMENTS RLS
-- ============================================================================
ALTER TABLE tag_product_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tag_product_assignments_select_policy ON tag_product_assignments FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY tag_product_assignments_insert_policy ON tag_product_assignments FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY tag_product_assignments_update_policy ON tag_product_assignments FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- TAG_LOCATIONS RLS
-- ============================================================================
ALTER TABLE tag_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tag_locations_select_policy ON tag_locations FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY tag_locations_insert_policy ON tag_locations FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- SENSOR_READINGS RLS
-- ============================================================================
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY sensor_readings_select_policy ON sensor_readings FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY sensor_readings_insert_policy ON sensor_readings FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- SENSOR_READINGS_HOURLY RLS
-- ============================================================================
ALTER TABLE sensor_readings_hourly ENABLE ROW LEVEL SECURITY;

CREATE POLICY sensor_readings_hourly_select_policy ON sensor_readings_hourly FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- IOT_ALERTS RLS
-- ============================================================================
ALTER TABLE iot_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY iot_alerts_select_policy ON iot_alerts FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY iot_alerts_insert_policy ON iot_alerts FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY iot_alerts_update_policy ON iot_alerts FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- IOT_ALERT_RULES RLS
-- ============================================================================
ALTER TABLE iot_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY iot_alert_rules_select_policy ON iot_alert_rules FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY iot_alert_rules_insert_policy ON iot_alert_rules FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY iot_alert_rules_update_policy ON iot_alert_rules FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- SPOILAGE_PREDICTIONS RLS
-- ============================================================================
ALTER TABLE spoilage_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY spoilage_predictions_select_policy ON spoilage_predictions FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY spoilage_predictions_insert_policy ON spoilage_predictions FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY spoilage_predictions_update_policy ON spoilage_predictions FOR UPDATE USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- DEVICE_HEALTH_LOGS RLS
-- ============================================================================
ALTER TABLE device_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY device_health_logs_select_policy ON device_health_logs FOR SELECT USING (
  device_id IN (
    SELECT id FROM iot_devices 
    WHERE organization_id = (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY device_health_logs_insert_policy ON device_health_logs FOR INSERT WITH CHECK (
  device_id IN (
    SELECT id FROM iot_devices 
    WHERE organization_id = (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  )
);

-- ============================================================================
-- DEVICE_PAIRING_TOKENS RLS
-- ============================================================================
ALTER TABLE device_pairing_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY device_pairing_tokens_select_policy ON device_pairing_tokens FOR SELECT USING (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY device_pairing_tokens_insert_policy ON device_pairing_tokens FOR INSERT WITH CHECK (
  organization_id = (
    SELECT organization_id FROM user_organizations 
    WHERE user_id = auth.uid()
  )
);
