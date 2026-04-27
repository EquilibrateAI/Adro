export const validateChartOption = (option: any): string | null => {
  // No option
  if (!option) {
    return "Chart config is missing";
  }

  //  No series
  if (!option.series) {
    return "Series is missing in chart config";
  }

  //  Series not array
  if (!Array.isArray(option.series)) {
    return "Series should be an array";
  }

  //Empty series
  if (option.series.length === 0) {
    return "Series is empty";
  }

  //  No valid data
  const hasValidData = option.series.some(
    (s: any) => Array.isArray(s.data) && s.data.length > 0
  );

  if (!hasValidData) {
    return "No valid data in chart";
  }

  //  Missing axis (for non-pie)
  const isPie = option.series[0]?.type === "pie";

  if (!isPie && !option.xAxis && !option.yAxis) {
    return "Missing xAxis/yAxis configuration";
  }
  return null;
};