import React from "react";
import ColumnInfo from "./column-info/column-info";
import ChatCli from "./chat-cli/chat-cli";

/**
 * A sub-layout component tailored for conversational, text-based data analysis.
 * Combines a persistent `ColumnInfo` view on the left-side panel (occupying 1/4 of the width) 
 * for contextual schema reference, while presenting a massive `ChatCli` interactive prompt 
 * box on the right (occupying 3/4) for querying data.
 * 
 * @returns {React.JSX.Element} The composed dashboard text analysis environment structure.
 */
export const TextMode: React.FC = () => {
  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full p-4">
      <div className="w-full lg:w-1/4">
        <ColumnInfo />
      </div>

      <div className="w-full lg:w-3/4">
        <ChatCli />
      </div>
    </div>
  );
};

export default TextMode;
