const chartColors = ['#5470C6', '#91CC75', '#EE6666', '#FAC858', '#73C0DE', '#3BA272', '#FC8452'];

const lineGrid = {
  left: '3%',
  right: '4%',
  bottom: '3%',
  containLabel: true
};

const lineTooltip = {
  trigger: 'axis',
  axisPointer: {
    type: 'cross',
    label: {
      backgroundColor: '#6a7985'
    }
  }
};

const lineXAxis = {
  type: 'category',
  name: 'Day of Week',
  nameLocation: 'center',
  nameGap: 30,
  nameTextStyle: {
    verticalAlign: 'middle',
    align: 'center'
  },
  data: [],
  boundaryGap: false,
  axisLabel: {
    formatter: '{value}'
  }
};

const lineYAxis = {
  type: 'value',
  name: 'Value',
  nameLocation: 'center',
  nameRotate: 90,
  nameGap: 40,
  nameTextStyle: {
    verticalAlign: 'middle',
    align: 'center'
  },
  axisLabel: {
    formatter: '{value}'
  },
  splitLine: {
    show: true,
    lineStyle: {
      type: 'dashed'
    }
  }
};

const lineSeries = {
  name: 'Metric',
  type: 'line',
  data: [],
  smooth: true,
  lineStyle: {
    width: 3
  },
  itemStyle: {
    color: chartColors[0]
  },
  symbol: 'circle',
  symbolSize: 8,
  areaStyle: {
    opacity: 0.1
  }
};

// Configuration options for ECharts line charts with smooth curves and area styling
export const lineChartOptions = {
  color: chartColors,
  tooltip: lineTooltip,
  grid: lineGrid,
  xAxis: [lineXAxis],
  yAxis: [lineYAxis],
  series: [lineSeries]
};
