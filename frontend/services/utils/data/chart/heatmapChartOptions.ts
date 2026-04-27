/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
const chartColors = [
  "#5470C6",
  "#91CC75",
  "#EE6666",
  "#FAC858",
  "#73C0DE",
  "#3BA272",
  "#FC8452",
];

const heatmapGrid = {
  left: "5%",
  right: "15%",
  bottom: "5%",
  top: "10%",
  containLabel: true,
};

const heatmapTooltip = {
  trigger: "item",
  formatter: function (params: any) {
    const xLabel = params.dimensionNames ? params.dimensionNames[0] : "X";
    const yLabel = params.dimensionNames ? params.dimensionNames[1] : "Y";
    const value = params.value[2];

    return `<strong>Correlation</strong><br/>
            ${xLabel} vs ${yLabel}<br/>
            Value: <strong>${value}</strong>`;
  },
};

const heatmapToolbox = {
  feature: {
    dataZoom: {
      yAxisIndex: "none",
    },
    dataView: { readOnly: false },
    restore: {},
    saveAsImage: {},
    clustering: {
      show: true,
      title: "Cluster Analysis",
      icon: "M8,8L12,12L16,8",
      onclick: function (_params: any) {
      },
    },
    correlationFilter: {
      show: true,
      title: "Filter by Correlation",
      icon: "M4,12L8,8L12,12L16,8",
      onclick: function (_params: any) {
      },
    },
    threshold: {
      show: true,
      title: "Set Threshold",
      icon: "M2,12L18,12M10,6L10,18",
      onclick: function (_params: any) {
      },
    },
    heatmapAnalyze: {
      show: true,
      title: "Pattern Analysis",
      icon: "M3,3L9,9M15,3L21,9",
      onclick: function (_params: any) {
      },
    },
  },
};

const heatmapDataZoom = [
  {
    type: "inside",
    xAxisIndex: 0,
    start: 0,
    end: 100,
  },
  {
    type: "inside",
    yAxisIndex: 0,
    start: 0,
    end: 100,
  },
];

const heatmapXAxis = {
  type: "category",
  data: [],
  splitArea: {
    show: true,
  },
  axisLabel: {
    rotate: 45,
    formatter: "{value}",
  },
};

const heatmapYAxis = {
  type: "category",
  data: [],
  splitArea: {
    show: true,
  },
  axisLabel: {
    formatter: "{value}",
  },
};

const heatmapVisualMap = {
  min: -1,
  max: 1,
  calculable: true,
  orient: "vertical",
  left: "85%",
  top: "center",
  inRange: {
    color: [
      "#313695",
      "#4575b4",
      "#74add1",
      "#abd9e9",
      "#e0f3f8",
      "#ffffcc",
      "#fee090",
      "#fdae61",
      "#f46d43",
      "#d73027",
      "#a50026",
    ],
  },
  text: ["High", "Low"],
  textStyle: {
    color: "#000",
  },
};

const heatmapSeries = {
  name: "Correlation",
  type: "heatmap",
  data: [],
  label: {
    show: true,
    formatter: function (params: any) {
      return params.value[2].toFixed(2);
    },
  },
  emphasis: {
    itemStyle: {
      shadowBlur: 10,
      shadowColor: "rgba(0, 0, 0, 0.5)",
    },
  },
};

export const heatmapChartOptions = {
  tooltip: heatmapTooltip,
  toolbox: heatmapToolbox,
  dataZoom: heatmapDataZoom,
  grid: heatmapGrid,
  xAxis: heatmapXAxis,
  yAxis: heatmapYAxis,
  visualMap: heatmapVisualMap,
  series: [heatmapSeries],
  color: chartColors,
};