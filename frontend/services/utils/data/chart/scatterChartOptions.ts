/* eslint-disable @typescript-eslint/no-explicit-any */
const scatterChartColors = [
  "#801880ff",
  "#91CC75",
  "#EE6666",
  "#87a715ff",
  "#73C0DE",
  "#3BA272",
  "#FC8452",
];

const scatterGrid = {
  left: "10%",
  right: "10%",
  bottom: "15%",
  top: "15%",
  containLabel: true,
};

const scatterTooltip = {
  trigger: "item",
  formatter: function (params: any) {
    const xAxisName = params.name || "X-Axis";
    const yAxisName = params.seriesName || "Y-Axis";

    return `<strong>${params.seriesName}</strong><br/>
            ${xAxisName}: ${params.data[0]}<br/>
            ${yAxisName}: ${params.data[1]}`;
  },
};

const scatterXAxis = {
  type: "value",
  name: "",
  nameLocation: "center",
  nameGap: 30,
  nameTextStyle: {
    verticalAlign: "middle",
    align: "center",
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
  },
};

const scatterYAxis = {
  type: "value",
  name: "",
  nameLocation: "center",
  nameRotate: 90,
  nameGap: 40,
  nameTextStyle: {
    verticalAlign: "middle",
    align: "center",
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
  },
};

const scatterSeries = {
  name: "",
  type: "scatter",
  data: [],
  symbolSize: 8,
  itemStyle: {
    color: scatterChartColors[0],
    opacity: 0.7,
  },
  emphasis: {
    itemStyle: {
      opacity: 1,
      borderColor: "#333",
      borderWidth: 1,
    },
  },
};

export const scatterChartOptions = {
  tooltip: scatterTooltip,
  grid: scatterGrid,
  color: scatterChartColors,
  xAxis: scatterXAxis,
  yAxis: scatterYAxis,
  series: [scatterSeries],
};