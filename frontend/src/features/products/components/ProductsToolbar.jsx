import { Button } from "../../../shared/components";
import DangerButton from "./DangerButton";

export default function ProductsToolbar({
  loading,
  resultsCount,
  selectedCount,

  q,
  onQChange,

  category,
  categories,
  onCategoryChange,

  active,
  onActiveChange,

  suspicious,
  onSuspiciousChange,

  hasSales,
  onHasSalesChange,

  onRefresh,
  onMergeSelected,
  onDeleteSelected,
  canMerge,
  canDelete,
}) {
  return (
    <div className="products-toolbar">
      <div className="products-toolbar-left">
        <div className="field">
          <label>Search</label>
          <input
            className="text"
            value={q}
            onChange={(e) => onQChange(e.target.value)}
            placeholder="Name, normalized name, category..."
          />
        </div>

        <div className="field">
          <label>Category</label>
          <select className="text" value={category} onChange={(e) => onCategoryChange(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All" : c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Status</label>
          <select className="text" value={active} onChange={(e) => onActiveChange(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="field">
          <label>Suspicious</label>
          <select className="text" value={suspicious} onChange={(e) => onSuspiciousChange(e.target.value)}>
            <option value="all">All</option>
            <option value="suspicious">Suspicious only</option>
            <option value="normal">Normal only</option>
          </select>
        </div>

        <div className="field">
          <label>Sales</label>
          <select className="text" value={hasSales} onChange={(e) => onHasSalesChange(e.target.value)}>
            <option value="all">All</option>
            <option value="has">Has sales</option>
            <option value="none">No sales</option>
          </select>
        </div>
      </div>

      <div className="products-toolbar-right">
        <div className="muted">
          {loading ? "Loading..." : `${resultsCount} results`}
          {selectedCount ? ` • ${selectedCount} selected` : ""}
        </div>

        <Button onClick={onRefresh} variant="secondary" disabled={loading}>
          Refresh
        </Button>

        <Button onClick={onMergeSelected} disabled={loading || !canMerge}>
          Merge selected
        </Button>

        <DangerButton onClick={onDeleteSelected} disabled={loading || !canDelete}>
          Delete selected
        </DangerButton>
      </div>
    </div>
  );
}
