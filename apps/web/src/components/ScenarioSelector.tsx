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
  return (
    <label className="flex min-w-[280px] flex-col gap-2 rounded-[1.5rem] border border-border bg-black/25 px-4 py-3 text-left backdrop-blur">
      <span className="text-[11px] uppercase tracking-[0.22em] text-muted">Dataset / Scenario</span>
      <select
        className="bg-transparent font-display text-xl text-text outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={selectedDatasetId ?? datasets[0]?.id ?? ""}
      >
        {datasets.map((dataset) => (
          <option key={dataset.id} value={dataset.id}>
            {dataset.name}
          </option>
        ))}
      </select>
    </label>
  );
}
