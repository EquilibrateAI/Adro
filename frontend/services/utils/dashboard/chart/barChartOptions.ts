const chartColors = ['#36bd73ff', '#91CC75', '#EE6666', '#FAC858', '#73C0DE', '#3BA272', '#FC8452'];

const barGrid = {
  left: '5%',
  right: '10%',
  top: '20%',   // Increased to make room for horizontal toolbox
  bottom: '15%',
  containLabel: true
};

const barTooltip = {
  trigger: 'axis',
  axisPointer: {
    type: 'shadow'
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const barToolbox = {
  show: true,
  orient: 'horizontal',
  right: '2%',
  top: '1%',
  bottom:'2%',
  feature: {
    saveAsImage: {
      show: true,
      title: 'Save as Image',
      type: 'png',
      backgroundColor: '#fff'
    },
    restore: {
      show: true,
      title: 'Restore'
    },
    dataView: {
      show: true,
      title: 'Data View',
      readOnly: false
    },
    magicType: {
      show: true,
      title: {
        line: 'Switch to Line Chart',
        bar: 'Switch to Bar Chart'
      },
      type: ['line', 'bar']
    }
  },
  iconStyle: {
    borderColor: '#666',
    borderWidth: 1
  },
  emphasis: {
    iconStyle: {
      borderColor: '#3BA272',
      borderWidth: 2
    }
  }
};

const barXAxis = {
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
};

const barYAxis = {
  type: 'value',
  name: 'Value',
  nameLocation: 'center',
  nameRotate: 90,
  nameGap: 40,
  nameTextStyle: {
    verticalAlign: 'middle',
    align: 'center'
  },
  axisLabel: { formatter: '{value}' }
};

const barSeries = {
  name: 'Direct',
  type: 'bar',
  barWidth: '60%',
  data: [],
  itemStyle: { color: chartColors[0] },
  label: {
    show: true,
    position: 'top',
    formatter: '{c}',
    fontWeight: 'bold',
    fontSize: 12
  },
  emphasis: {
    label: {
      show: true,
      fontSize: 14
    }
  }
};

// Configuration options for ECharts bar charts, including toolboxes, tooltips, and default styles
export const barChartOptions = {
  tooltip: barTooltip,
  
  grid: barGrid,
  color: chartColors,
  xAxis: [barXAxis],
  yAxis: [barYAxis],
  series: [barSeries]
};