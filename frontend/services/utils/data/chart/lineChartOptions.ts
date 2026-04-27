/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
const chartColors = [
  "#e2541cff",
  "#91CC75",
  "#EE6666",
  "#FAC858",
  "#9c3d4aff",
  "#3BA272",
  "#FC8452",
];

const lineTitle = {
  top: "10%",
  textStyle: {
    color: "#333",
    fontSize: 18,
  },
};

const lineGrid = {
  left: "8%",
  right: "9%",
  bottom: "8%",
  top: "15%",
  containLabel: true,
};

const lineTooltip = {
  trigger: "axis",
  axisPointer: {
    type: "cross",
    label: {
      backgroundColor: "#6a7985",
    },
  },
};

const lineToolbox = {
  feature: {
    dataZoom: {
      yAxisIndex: "none",
    },
    dataView: { readOnly: false },
    magicType: { type: ["line", "bar"] },
    restore: {},
    saveAsImage: {},
    trendAnalysis: {
      show: true,
      title: "Trend Analysis",
      icon: "M3,17L9,11L13,15L21,7",
      onclick: function (_params: any) {
      },
    },
    forecast: {
      show: true,
      title: "Forecast",
      icon: "M12,2L12,22M8,6L16,18",
      onclick: function (_params: any) {
      },
    },
    seasonality: {
      show: true,
      title: "Seasonality Detection",
      icon: "M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2",
      onclick: function (_params: any) {
      },
    },
    smooth: {
      show: true,
      title: "Smooth Lines",
      icon: "M2,12C6,6 14,6 18,12C22,18 14,18 10,12",
      onclick: function (_params: any) {
      },
    },
  },
};

const lineDataZoom = [
  {
    type: "inside",
    start: 0,
    end: 100,
    xAxisIndex: [0],
  },
  {
    type: "inside",
    start: 0,
    end: 100,
    yAxisIndex: [0],
  },
];

const lineXAxis = {
  type: "category",
  name: "",
  nameLocation: "center",
  nameGap: 30,
  nameTextStyle: {
    verticalAlign: "middle",
    align: "center",
  },
  data: [],
  boundaryGap: false,
  axisLabel: {
    formatter: "{value}",
  },
};

function createYAxis(name: any, color: any, position: string = "left") {
  const offset = position === "right" ? 20 : 0;
  return {
    type: "value",
    name: name,
    position: position,
    offset: offset,
    nameLocation: "middle",
    nameGap: 50,
    nameRotate: 90,
    nameTextStyle: {
      verticalAlign: "middle",
      align: "center",
      color: color,
    },
    axisLine: {
      lineStyle: {
        color: color,
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: color,
      },
    },
    axisLabel: {
      formatter: function (value: any) {
        if (value >= 1000000000) {
          return (value / 1000000000).toFixed(1) + "B";
        } else if (value >= 1000000) {
          return (value / 1000000).toFixed(1) + "M";
        } else if (value >= 1000) {
          return (value / 1000).toFixed(1) + "K";
        }
        return value;
      },
      color: color,
    },
    splitLine: {
      show: position === "left",
      lineStyle: {
        type: "dashed",
      },
    },
  };
}

function createLineSeries(name: any, data: any, color: any, yAxisIndex: any) {
  return {
    name: name,
    type: "line",
    smooth: true,
    data: data,
    yAxisIndex: yAxisIndex,
    lineStyle: {
      width: 3,
      color: color,
    },
    itemStyle: {
      color: color,
    },
    symbol: "circle",
    symbolSize: 6,
  };
}

export const lineChartOptions = {
  title: lineTitle,
  color: chartColors,
  tooltip: lineTooltip,
  toolbox: lineToolbox,
  dataZoom: lineDataZoom,
  grid: lineGrid,
  xAxis: [lineXAxis],
  yAxis: [],
  series: [],
};

export { createYAxis, createLineSeries };