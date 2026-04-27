/* eslint-disable @typescript-eslint/no-explicit-any */
const chartColors = [
  "#3f993fff",
  "#91CC75",
  "#EE6666",
  "#FAC858",
  "#73C0DE",
  "#3BA272",
  "#FC8452",
];

const boxTitle = {
  top: "10%",
  left: "center",
  textStyle: {
    color: "#702f2fff",
    fontSize: 18,
    fontWeight: "bold",
  },
};

const boxGrid = {
  left: "10%",
  right: "10%",
  bottom: "15%",
  top: "20%",
  containLabel: true,
};

const boxTooltip = {
  trigger: "item",
  formatter: function (params: any) {
    const data = params.data;

    const formatValue = (value: number) => {
      if (value >= 1000000000) {
        return (value / 1000000000).toFixed(1) + "B";
      } else if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + "M";
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + "K";
      }
      return value;
    };

    return `<strong>${params.name}</strong><br/>
                Max: ${formatValue(data[4])}<br/>
                Q3: ${formatValue(data[3])}<br/>
                Median: ${formatValue(data[2])}<br/>
                Q1: ${formatValue(data[1])}<br/>
                Min: ${formatValue(data[0])}`;
  },
};

const boxToolbox = {
  feature: {
    dataZoom: {
      yAxisIndex: "none",
    },
    dataView: { readOnly: false },
    restore: {},
    saveAsImage: {},
    selectBox: {},
    outlierFilter: {
      show: true,
      title: "Filter Outliers",
      icon: "M10,10L20,20M20,10L10,20",
      onclick: function () {
      },
    },
    statistics: {
      show: true,
      title: "Show Statistics",
      icon: "M5,5L15,15M5,15L15,5",
      onclick: function () {
      },
    },
    compare: {
      show: true,
      title: "Compare Groups",
      icon: "M2,10L8,10M12,10L18,10",
      onclick: function () {
      },
    },
  },
};

const boxDataZoom = [
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

const boxXAxis = {
  type: "category",
  name: "",
  nameLocation: "center",
  nameGap: 30,
  nameTextStyle: {
    verticalAlign: "middle",
    align: "center",
  },
  data: [],
  axisTick: { alignWithLabel: true },
  axisLabel: { formatter: "{value}" },
};

const boxYAxis = {
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
    formatter: function (value: number) {
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

const boxSeries = {
  name: "",
  type: "boxplot",
  boxWidth: ["40%", "60%"],
  data: [],
  itemStyle: {
    color: "rgba(84, 112, 198, 0.6)",
    borderColor: "#5470C6",
    borderWidth: 2,
  },
  emphasis: {
    itemStyle: {
      color: "rgba(84, 112, 198, 0.8)",
      borderColor: "#3BA272",
      borderWidth: 3,
    },
  },
};

export const boxChartOptions = {
  title: boxTitle,
  tooltip: boxTooltip,
  toolbox: boxToolbox,
  dataZoom: boxDataZoom,
  grid: boxGrid,
  color: chartColors,
  xAxis: boxXAxis,
  yAxis: boxYAxis,
  series: [boxSeries],
};
