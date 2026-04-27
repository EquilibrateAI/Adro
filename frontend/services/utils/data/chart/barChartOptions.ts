const chartColors = ['#20c760ff', '#2d7a8dff', '#EE6666', '#FAC858', '#3c9114ff', '#1b768dff', '#FC8452'];

const barGrid = {
  left: '5%',
  right: '5%',
  bottom: '10%',
  containLabel: true
};

const barTooltip = {
  trigger: 'axis',
  axisPointer: {
    type: 'shadow'
  }
};

const barToolbox = {
  feature: {
    dataZoom: {
      yAxisIndex: 'none'
    },
    dataView: { readOnly: false },
    magicType: { type: ['line', 'bar'] },
    restore: {},
    saveAsImage: {},
    }
  };


const barDataZoom = [
  {
    type: 'inside',
    start: 0,
    end: 100,
    xAxisIndex: [0]
  },
  {
    type: 'inside',
    start: 0,
    end: 100,
    yAxisIndex: [0]
  }
];


const barXAxis = [{
  type: 'category',
  name: '',
  nameLocation: 'center',
  nameGap: 30,
  nameTextStyle: {
    verticalAlign: 'middle',
    align: 'center'
  },
  data: [],
  axisTick: { alignWithLabel: true },
  axisLabel: { formatter: '{value}' }
}];

const barYAxis = [{
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
    formatter: function (value: number) {
      if (value >= 1000000000) {
        return (value / 1000000000).toFixed(1) + 'B';
      } else if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M';
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + 'K';
      }
      return value;
    }
  }
}];

const barSeries = {
  name: '',
  type: 'bar',
  barWidth: '60%',
  data: [],
  itemStyle: { color: chartColors[0] }
};

export const barChartOptions = {
  tooltip: barTooltip,
  toolbox: barToolbox,
  dataZoom: barDataZoom,
  grid: barGrid,
  color: chartColors,
  xAxis: barXAxis,
  yAxis: barYAxis,
  series: [barSeries]
};
