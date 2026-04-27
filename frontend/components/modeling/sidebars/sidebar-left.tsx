import SidebarLeftPredict from "./sidebar-left-predict";
import SidebarLeftOptimise from "./sidebar-left-optimise";

interface SidebarLeftProps {
  activeTab: "predict" | "optimize";

  predictors: string[];
  predictorValues: string[];
  targets: string[];
  targetValues: string[];
  updatePredictor: (index: number, value: string) => void;
  updatePredictorValue: (index: number, value: string) => void;
  updateTarget: (index: number, value: string) => void;
  updateTargetValue: (index: number, value: string) => void;
  addPredictor: () => void;
  removePredictor: (index: number) => void;
  addTarget: () => void;
  removeTarget: (index: number) => void;
  onRun: () => void;
}

/**
 * SidebarLeft
 * Orchestrates the display of either prediction or optimization sidebar modules
 * based on the activeTab prop. It delegates the complex configuration forms 
 * to their respective child components.
 */
export default function SidebarLeft(props: SidebarLeftProps) {
  const { activeTab } = props;

  return (
    <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-84 bg-white flex flex-col shadow-xl border-r border-slate-200 z-50 min-w-0 overflow-hidden">
      <div style={{ display: activeTab === "predict" ? "flex" : "none" }} className="flex-col h-full">
        <SidebarLeftPredict {...props} />
      </div>
      <div style={{ display: activeTab === "optimize" ? "flex" : "none" }} className="flex-col h-full">
        <SidebarLeftOptimise {...props} />
      </div>
    </div>
  );
}
