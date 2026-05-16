/**
 * Cleanup forecast data when outlet is removed.
 */

/**
 * Remove forecast engine and optionally archive data for an outlet.
 */
export async function removeForecastForOutlet(
  _orgId: string,
  _outletId: string,
): Promise<void> {
  // Stub: delete forecast_models row, optionally archive forecast_data_points
}

/**
 * Archive forecast data for an outlet (for reporting).
 */
export async function archiveForecastData(_outletId: string): Promise<void> {
  // Stub: move to archive table or cold storage
}
