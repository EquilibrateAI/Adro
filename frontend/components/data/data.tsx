"use client"

import DataExploreComponent from "./data-explore/data-explore"

/**
 * Top-level container component for the Data view.
 * Responsible for rendering the primary structural frame (e.g. padding and sidebar offset margins)
 * before injecting the functional sub-components that manage tables, charts, and filtering.
 * 
 * @returns {React.JSX.Element} The rendered `DataExploreComponent` inside a formatted flexbox shell.
 */
export function Data() {
  return (
    <div className="min-h-screen ml-80">
      <div className="p-6">
        <DataExploreComponent />
      </div>
    </div>
  )
}
