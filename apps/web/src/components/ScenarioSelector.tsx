import type { DemoDatasetSummary } from "../types.js";

interface ScenarioSelectorProps {
  datasets: DemoDatasetSummary[];
  selectedDatasetId?: string;
  onChange: (datasetId: string) => void;
}

export function ScenarioSelector({
  datasets,
  selectedDatasetId,
  onChange
}: ScenarioSelectorProps) {
  const selectedDataset = datasets.find((dataset) => dataset.id === selectedDatasetId) ?? datasets[0];

  return (
    <div className="min-w-[300px] rounded-panel border border-white/10 bg-black/25 px-4 py-4 text-left backdrop-blur">
      <label className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted">Dataset / Scenario</span>
        <select
          className="bg-transparent font-display text-xl text-text outline-none"
          onChange={(event) => onChange(event.target.value)}
          value={selectedDataset?.id ?? datasets[0]?.id ?? ""}
        >
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
      </label>
      {selectedDataset ? (
        <div className="mt-4 rounded-tile border border-white/8 bg-white/[0.03] p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-muted">
              {selectedDataset.profile}
            </span>
            <span className="rounded-full border border-profit/20 bg-profit/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-profit">
              Synthetic validation {selectedDataset.validationStatus}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-text">{selectedDataset.ownerDiagnosis}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{selectedDataset.demoNarrative}</p>
        </div>
      ) : null}
    </div>
  );
}
