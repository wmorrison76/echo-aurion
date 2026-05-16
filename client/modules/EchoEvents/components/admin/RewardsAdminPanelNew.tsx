import React, { useState } from "react";
import {
  useSalesSeasons,
  createSeason,
  updateSeason,
  runSeasonProcessing,
} from "../../hooks/useSalesSeasons";
export const RewardsAdminPanelNew: React.FC = () => {
  const { seasons, loading, error, reload } = useSalesSeasons();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonStartDate, setNewSeasonStartDate] = useState("");
  const [newSeasonEndDate, setNewSeasonEndDate] = useState("");
  const [newSeasonIsActive, setNewSeasonIsActive] = useState(false);
  const handleCreateSeason = async () => {
    if (!newSeasonName || !newSeasonStartDate || !newSeasonEndDate) {
      alert("Please fill in all fields");
      return;
    }
    try {
      await createSeason({
        name: newSeasonName,
        startDate: newSeasonStartDate,
        endDate: newSeasonEndDate,
        isActive: newSeasonIsActive,
      });
      setNewSeasonName("");
      setNewSeasonStartDate("");
      setNewSeasonEndDate("");
      setNewSeasonIsActive(false);
      setShowCreateForm(false);
      await reload();
    } catch (err: any) {
      alert(`Error creating season: ${err.message}`);
    }
  };
  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateSeason(id, { isActive: !isActive });
      await reload();
    } catch (err: any) {
      alert(`Error updating season: ${err.message}`);
    }
  };
  const handleRunSeasonProcessing = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus("Processing active seasons...");
      await runSeasonProcessing();
      setProcessingStatus("Season processing completed!");
      setTimeout(() => setProcessingStatus(null), 3000);
      await reload();
    } catch (err: any) {
      setProcessingStatus(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
  return (
    <div className="border rounded-lg p-4 text-xs space-y-4">
      {" "}
      <div className="flex justify-between items-center">
        {" "}
        <div>
          {" "}
          <div className="text-sm font-semibold">
            {" "}
            Sales Seasons & Rewards Admin{" "}
          </div>{" "}
          <div className="text-[0.65rem] text-muted-foreground">
            {" "}
            Manage seasonal performance windows and trigger reward
            snapshots.{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex gap-2">
        {" "}
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-primary text-white px-3 py-1 rounded text-[0.7rem] font-semibold hover:opacity-90"
        >
          {" "}
          {showCreateForm ? "Cancel" : "New Season"}{" "}
        </button>{" "}
        <button
          onClick={handleRunSeasonProcessing}
          disabled={isProcessing}
          className="bg-green-600 text-white px-3 py-1 rounded text-[0.7rem] font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {" "}
          {isProcessing ? "Processing..." : "Run Season Snapshot"}{" "}
        </button>{" "}
      </div>{" "}
      {processingStatus && (
        <div
          className={`rounded p-2 text-[0.65rem] ${processingStatus.startsWith("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
        >
          {" "}
          {processingStatus}{" "}
        </div>
      )}{" "}
      {showCreateForm && (
        <div className="border rounded p-3 bg-muted/50 space-y-2">
          {" "}
          <div>
            {" "}
            <label className="block text-[0.6rem] font-semibold mb-1">
              {" "}
              Season Name{" "}
            </label>{" "}
            <input
              type="text"
              className="border rounded px-2 py-1 w-full text-[0.65rem]"
              value={newSeasonName}
              onChange={(e) => setNewSeasonName(e.target.value)}
              placeholder="e.g., Winter 2024"
            />{" "}
          </div>{" "}
          <div className="grid grid-cols-2 gap-2">
            {" "}
            <div>
              {" "}
              <label className="block text-[0.6rem] font-semibold mb-1">
                {" "}
                Start Date{" "}
              </label>{" "}
              <input
                type="date"
                className="border rounded px-2 py-1 w-full text-[0.65rem]"
                value={newSeasonStartDate}
                onChange={(e) => setNewSeasonStartDate(e.target.value)}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="block text-[0.6rem] font-semibold mb-1">
                {" "}
                End Date{" "}
              </label>{" "}
              <input
                type="date"
                className="border rounded px-2 py-1 w-full text-[0.65rem]"
                value={newSeasonEndDate}
                onChange={(e) => setNewSeasonEndDate(e.target.value)}
              />{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center">
            {" "}
            <input
              type="checkbox"
              id="isActive"
              className="mr-2"
              checked={newSeasonIsActive}
              onChange={(e) => setNewSeasonIsActive(e.target.checked)}
            />{" "}
            <label htmlFor="isActive" className="text-[0.65rem] font-semibold">
              {" "}
              Activate immediately{" "}
            </label>{" "}
          </div>{" "}
          <button
            onClick={handleCreateSeason}
            className="w-full bg-primary text-white px-3 py-1 rounded text-[0.7rem] font-semibold hover:opacity-90"
          >
            {" "}
            Create Season{" "}
          </button>{" "}
        </div>
      )}{" "}
      {loading && (
        <div className="text-[0.65rem] text-muted-foreground">
          {" "}
          Loading seasons…{" "}
        </div>
      )}{" "}
      {error && <div className="text-[0.65rem] text-red-600">{error}</div>}{" "}
      {!loading && seasons.length === 0 && !error && (
        <div className="text-[0.65rem] text-muted-foreground">
          {" "}
          No seasons created yet.{" "}
        </div>
      )}{" "}
      {!loading && seasons.length > 0 && (
        <div className="space-y-2">
          {" "}
          {seasons.map((season) => (
            <div
              key={season.id}
              className="border rounded p-2 flex justify-between items-center"
            >
              {" "}
              <div>
                {" "}
                <div className="text-[0.7rem] font-semibold">
                  {season.name}
                </div>{" "}
                <div className="text-[0.6rem] text-muted-foreground">
                  {" "}
                  {new Date(season.start_date).toLocaleDateString()} -{""}{" "}
                  {new Date(season.end_date).toLocaleDateString()}{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex items-center gap-2">
                {" "}
                <div
                  className={`text-[0.6rem] font-semibold px-2 py-1 rounded ${season.is_active ? "bg-green-100 text-green-700" : "bg-surface text-foreground"}`}
                >
                  {" "}
                  {season.is_active ? "Active" : "Inactive"}{" "}
                </div>{" "}
                <button
                  onClick={() =>
                    handleToggleActive(season.id, season.is_active)
                  }
                  className="text-[0.6rem] text-primary hover:text-blue-700 font-semibold"
                >
                  {" "}
                  {season.is_active ? "Deactivate" : "Activate"}{" "}
                </button>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
};
