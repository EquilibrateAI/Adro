const chartColors = ['#5470C6', '#91CC75', '#EE6666', '#FAC858', '#73C0DE', '#3BA272', '#FC8452'];

const pieTooltip = {
  trigger: 'item',
  formatter: '{a} <br/>{b}: {c} ({d}%)'
};

const pieLegend = {
  orient: 'vertical',
  top: 'middle',
  left: 'left',
  textStyle: {
    fontSize: 12
  }
};

const pieSeries = {
  name: '',
  type: 'pie',
  radius: '50%',
  center: ['50%', '50%'],
  data: [],
  label: {
    show: false,
  }
};

export const pieChartOptions = {
  tooltip: pieTooltip,
  color: chartColors,
  legend: pieLegend,
  series: [pieSeries]
};
