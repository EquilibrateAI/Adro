/* eslint-disable @typescript-eslint/no-explicit-any */
const chartColors = ['#5470C6', '#91CC75', '#EE6666', '#FAC858', '#73C0DE', '#3BA272', '#FC8452'];

const funnelGrid = {
    left: '5%',
    right: '5%',
    top: '10%',
    bottom: '5%',
    containLabel: true
};

const funnelTooltip = {
    trigger: 'item',
    formatter: function (params: any) {
        const value = params.value;
        let formattedValue = value;
        
        if (value >= 1000000000) {
            formattedValue = (value / 1000000000).toFixed(1) + 'B';
        } else if (value >= 1000000) {
            formattedValue = (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            formattedValue = (value / 1000).toFixed(1) + 'K';
        }
        
        return `<strong>${params.name}</strong><br/>
                Value: ${formattedValue}<br/>
                Percentage: ${params.percent}%`;
    }
};

const funnelSeries = {
    name: '',
    type: 'funnel',
    left: '5%',
    right: '5%',
    top: '80px',
    bottom: '60px',
    width: '90%',
    height: 'auto',
    min: 0,
    max: 100,
    minSize: '2%',
    maxSize: '98%',
    sort: 'descending',
    gap: 8,
    orient: 'vertical',
    funnelAlign: 'center',
    label: {
        show: true,
        position: 'inside',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#fff',
        formatter: function (params: any) {
            const value = params.value;
            let formattedValue = value;
            
            if (value >= 1000000000) {
                formattedValue = (value / 1000000000).toFixed(1) + 'B';
            } else if (value >= 1000000) {
                formattedValue = (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
                formattedValue = (value / 1000).toFixed(1) + 'K';
            }
            
            return `{b}\n${formattedValue}`;
        }
    },
    labelLine: {
        show: false
    },
    itemStyle: {
        borderColor: '#fff',
        borderWidth: 2,
        opacity: 0.9
    },
    emphasis: {
        itemStyle: {
            opacity: 1,
            shadowBlur: 10,
            shadowColor: 'rgba(0,0,0,0.3)'
        },
        label: {
            fontSize: 14,
            fontWeight: 'bold'
        }
    },
    data: []
};

export const funnelChartOptions = {
    tooltip: funnelTooltip,
    grid: funnelGrid,
    series: [funnelSeries],
    color: chartColors
};
