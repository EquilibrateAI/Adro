const chartColors = ['#5470C6', '#91CC75', '#EE6666', '#FAC858', '#73C0DE', '#3BA272', '#FC8452'];

const pieTooltip = {
  trigger: 'item',
  formatter: '{a} <br/>{b}: {c} ({d}%)'
};

const pieLegend = {
  orient: 'vertical',
  left: 'left',
  top: 'middle',
  textStyle: {
    fontSize: 12
  },
  itemWidth: 20,
  itemHeight: 14,
  itemGap: 8
};

const pieToolbox = {
  show: true,
  orient: 'horizontal',
  right: '5%',
  top: '2%',
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
    }
  },
  iconStyle: {
    borderColor: '#666',
    borderWidth: 1
  },
  emphasis: {
    iconStyle: {
      borderColor: '#5470C6',
      borderWidth: 2
    }
  }
};

const pieSeries = {
  name: '',
  type: 'pie',
  radius: ['40%', '70%'], 
  center: ['60%', '50%'],
  data: [],
  label: {
    show: true,
    position: 'outside',
    formatter: '{b}: {d}%',
    fontSize: 11
  },
  emphasis: {
    itemStyle: {
      shadowBlur: 10,
      shadowOffsetX: 0,
      shadowColor: 'rgba(0, 0, 0, 0.5)'
    }
  }
};

// Configuration options for ECharts donut/pie charts with legends and tooltips
export const pieChartOptions = {
  tooltip: pieTooltip,
  toolbox: pieToolbox,
  color: chartColors,
  legend: pieLegend,
  series: [pieSeries]
};