let isMetric = true;
        let myChart = null;

        function changeUnits() {
            const val = document.getElementById('unit-select').value;
            isMetric = (val === 'metric');
            
            // Update labels
            document.querySelectorAll('.u-rate').forEach(el => el.innerText = isMetric ? 'kg/mm' : 'lbs/in');
            document.querySelectorAll('.u-dist').forEach(el => el.innerText = isMetric ? 'mm' : 'in');
            document.querySelectorAll('.u-force').forEach(el => el.innerText = isMetric ? 'kg' : 'lbs');
            
            // Convert existing values
            const els = ['spring-rate', 'free-length', 'bind-height', 'installed-height', 'valve-lift'];
            els.forEach(id => {
                let v = parseFloat(document.getElementById(id).value) || 0;
                if (isMetric) {
                    // Imp -> Met
                    if (id === 'spring-rate') v = v * 0.017857967; // lbs/in to kg/mm
                    else v = v * 25.4; // in to mm
                } else {
                    // Met -> Imp
                    if (id === 'spring-rate') v = v / 0.017857967;
                    else v = v / 25.4;
                }
                
                // Adjust precision
                if (id === 'spring-rate') {
                    document.getElementById(id).value = isMetric ? v.toFixed(2) : Math.round(v);
                } else {
                    document.getElementById(id).value = isMetric ? v.toFixed(2) : v.toFixed(3);
                }
            });
            
            calculate();
        }

        function initChart() {
            const ctx = document.getElementById('springChart').getContext('2d');
            
            Chart.defaults.color = '#a1a1aa';
            Chart.defaults.font.family = "'Inter', sans-serif";

            myChart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'Spring Force Curve',
                            data: [],
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0,
                            pointRadius: 0
                        },
                        {
                            label: 'Seat Height',
                            data: [],
                            borderColor: '#f59e0b',
                            borderWidth: 2,
                            pointBackgroundColor: '#f59e0b',
                            pointRadius: 6,
                            showLine: false
                        },
                        {
                            label: 'Open Height',
                            data: [],
                            borderColor: '#ef4444',
                            borderWidth: 2,
                            pointBackgroundColor: '#ef4444',
                            pointRadius: 6,
                            showLine: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return context.raw.y.toFixed(1) + (isMetric ? ' kg' : ' lbs');
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            title: { display: true, text: 'Spring Height' },
                            reverse: true, // Lower height = more compression
                            grid: { color: '#27272a' }
                        },
                        y: {
                            title: { display: true, text: 'Force' },
                            grid: { color: '#27272a' },
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        function calculate() {
            const getVal = id => Math.max(0, parseFloat(document.getElementById(id).value) || 0);

            const rate = getVal('spring-rate');
            const freeLen = getVal('free-length');
            const bindHeight = getVal('bind-height');
            const installedHeight = getVal('installed-height');
            const lift = getVal('valve-lift');

            // Math
            const openHeight = installedHeight - lift;
            const compSeat = Math.max(0, freeLen - installedHeight);
            const compOpen = Math.max(0, freeLen - openHeight);
            
            const seatPress = compSeat * rate;
            const openPress = compOpen * rate;
            const bindClearance = openHeight - bindHeight;

            // DOM Updates
            const prec = isMetric ? 2 : 3;
            document.getElementById('out-seat-press').innerText = Math.round(seatPress);
            document.getElementById('out-open-press').innerText = Math.round(openPress);
            document.getElementById('out-clearance').innerText = bindClearance.toFixed(prec);
            
            document.getElementById('out-open-height').innerText = openHeight.toFixed(prec);
            document.getElementById('out-comp-seat').innerText = compSeat.toFixed(prec);
            document.getElementById('out-comp-open').innerText = compOpen.toFixed(prec);

            // Clearance Warning Logic (Usually 0.060" or ~1.5mm is minimum safe clearance)
            const safeClearance = isMetric ? 1.5 : 0.060;
            const boxBind = document.getElementById('box-bind');
            if (bindClearance < safeClearance) {
                boxBind.classList.add('warning');
                boxBind.classList.remove('safe');
            } else {
                boxBind.classList.add('safe');
                boxBind.classList.remove('warning');
            }

            // Update Chart
            if (myChart) {
                // Generate line points from Free Length down to Bind Height
                const points = [];
                const steps = 20;
                const range = freeLen - bindHeight;
                const stepSize = range / steps;

                for(let i = 0; i <= steps; i++) {
                    let h = freeLen - (i * stepSize);
                    let f = (freeLen - h) * rate;
                    points.push({ x: h, y: f });
                }

                myChart.data.datasets[0].data = points;
                
                // Seat Point
                myChart.data.datasets[1].data = [{ x: installedHeight, y: seatPress }];
                
                // Open Point
                myChart.data.datasets[2].data = [{ x: openHeight, y: openPress }];
                
                myChart.options.scales.x.title.text = 'Spring Height (' + (isMetric ? 'mm' : 'in') + ')';
                myChart.options.scales.y.title.text = 'Force (' + (isMetric ? 'kg' : 'lbs') + ')';

                myChart.update();
            }
        }

        window.onload = () => {
            initChart();
            calculate();
        };