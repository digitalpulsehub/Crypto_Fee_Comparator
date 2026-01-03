// Professional Crypto Fee Comparator
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const cryptoDashboard = document.getElementById('crypto-dashboard');
    const loadingOverlay = document.getElementById('loading-overlay');
    const lastUpdate = document.getElementById('last-update');
    const avgFeeElement = document.getElementById('avg-fee');
    const networkCountElement = document.getElementById('network-count');
    const updateTimeElement = document.getElementById('update-time');
    const baseCurrencySelect = document.getElementById('base-currency');
    const feeTypeSelect = document.getElementById('fee-type');
    const autoRefreshToggle = document.getElementById('auto-refresh');
    const refreshStatus = document.getElementById('refresh-status');
    const manualRefreshBtn = document.getElementById('manual-refresh');
    const exportDataBtn = document.getElementById('export-data');
    const viewButtons = document.querySelectorAll('.view-btn');
    const toast = document.getElementById('toast');
    const toastClose = document.querySelector('.toast-close');
    
    // Chart instance
    let efficiencyChart = null;
    
    // Configuration
    let refreshInterval = null;
    let currentBaseCurrency = 'USD';
    let currentFeeType = 'absolute';
    let autoRefreshEnabled = true;
    let currentView = 'grid';
    let updateCount = 0;
    
    // Exchange rates (simulated - in production would come from an API)
    const exchangeRates = {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        BTC: 0.000025,
        ETH: 0.0004
    };
    
    // Crypto data with realistic properties
    const cryptocurrencies = [
        {
            id: 'bitcoin',
            name: 'Bitcoin',
            symbol: 'BTC',
            icon: 'fab fa-bitcoin',
            color: '#F7931A',
            price: 42000,
            change: 2.4,
            fees: {
                low: { value: 1.2, time: '30-60 min' },
                medium: { value: 2.8, time: '10-30 min' },
                high: { value: 5.5, time: '5-10 min' },
                urgent: { value: 8.2, time: '1-5 min' }
            },
            tps: 7,
            marketCap: 820000000000
        },
        {
            id: 'ethereum',
            name: 'Ethereum',
            symbol: 'ETH',
            icon: 'fab fa-ethereum',
            color: '#627EEA',
            price: 2200,
            change: 1.8,
            fees: {
                low: { value: 12, time: '5-15 min' },
                medium: { value: 25, time: '2-5 min' },
                high: { value: 40, time: '1-2 min' },
                urgent: { value: 65, time: '<1 min' }
            },
            tps: 15,
            marketCap: 265000000000
        },
        {
            id: 'solana',
            name: 'Solana',
            symbol: 'SOL',
            icon: 'fas fa-bolt',
            color: '#00FFA3',
            price: 100,
            change: 5.2,
            fees: {
                low: { value: 0.0001, time: '5-10 sec' },
                medium: { value: 0.00025, time: '2-5 sec' },
                high: { value: 0.0005, time: '1-2 sec' },
                urgent: { value: 0.001, time: '<1 sec' }
            },
            tps: 3000,
            marketCap: 42000000000
        },
        {
            id: 'cardano',
            name: 'Cardano',
            symbol: 'ADA',
            icon: 'fas fa-chart-line',
            color: '#0033AD',
            price: 0.42,
            change: -0.5,
            fees: {
                low: { value: 0.17, time: '5-10 min' },
                medium: { value: 0.25, time: '2-5 min' },
                high: { value: 0.35, time: '1-2 min' },
                urgent: { value: 0.5, time: '<1 min' }
            },
            tps: 250,
            marketCap: 15000000000
        },
        {
            id: 'polygon',
            name: 'Polygon',
            symbol: 'MATIC',
            icon: 'fas fa-layer-group',
            color: '#8247E5',
            price: 0.78,
            change: 3.2,
            fees: {
                low: { value: 0.01, time: '1-3 min' },
                medium: { value: 0.03, time: '30-60 sec' },
                high: { value: 0.06, time: '10-30 sec' },
                urgent: { value: 0.12, time: '<10 sec' }
            },
            tps: 7000,
            marketCap: 7200000000
        },
        {
            id: 'avalanche',
            name: 'Avalanche',
            symbol: 'AVAX',
            icon: 'fas fa-mountain',
            color: '#E84142',
            price: 35,
            change: 2.1,
            fees: {
                low: { value: 0.05, time: '1-2 min' },
                medium: { value: 0.12, time: '30-60 sec' },
                high: { value: 0.25, time: '10-30 sec' },
                urgent: { value: 0.4, time: '<10 sec' }
            },
            tps: 4500,
            marketCap: 13000000000
        }
    ];
    
    // Initialize the application
    function init() {
        renderDashboard();
        setupEventListeners();
        initializeChart();
        startAutoRefresh();
        hideLoadingOverlay();
        
        // Initial data update
        updateAllData();
    }
    
    // Render the crypto dashboard
    function renderDashboard() {
        cryptoDashboard.innerHTML = '';
        
        cryptocurrencies.forEach(crypto => {
            const card = document.createElement('div');
            card.className = 'crypto-card';
            card.id = `card-${crypto.id}`;
            card.dataset.view = currentView;
            
            // Format price change with sign
            const changeSign = crypto.change >= 0 ? '+' : '';
            const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
            
            card.innerHTML = `
                <div class="crypto-header">
                    <div class="crypto-icon">
                        <i class="${crypto.icon}" style="color: ${crypto.color}"></i>
                        <div class="crypto-info">
                            <h3>${crypto.name}</h3>
                            <div class="crypto-symbol">${crypto.symbol}</div>
                        </div>
                    </div>
                    <div class="crypto-price">
                        <div class="price-value">${formatCurrency(crypto.price, currentBaseCurrency)}</div>
                        <div class="price-change ${changeClass}">${changeSign}${crypto.change.toFixed(2)}%</div>
                    </div>
                </div>
                
                <div class="crypto-fees">
                    <div class="fee-item low">
                        <div class="fee-label">
                            <span>Low Priority</span>
                            <i class="fas fa-walking"></i>
                        </div>
                        <div class="fee-value" id="${crypto.id}-low">${formatFee(crypto.fees.low.value, crypto.symbol, currentBaseCurrency)}</div>
                        <div class="fee-time">${crypto.fees.low.time}</div>
                    </div>
                    
                    <div class="fee-item medium">
                        <div class="fee-label">
                            <span>Medium Priority</span>
                            <i class="fas fa-tachometer-alt"></i>
                        </div>
                        <div class="fee-value" id="${crypto.id}-medium">${formatFee(crypto.fees.medium.value, crypto.symbol, currentBaseCurrency)}</div>
                        <div class="fee-time">${crypto.fees.medium.time}</div>
                    </div>
                    
                    <div class="fee-item high">
                        <div class="fee-label">
                            <span>High Priority</span>
                            <i class="fas fa-running"></i>
                        </div>
                        <div class="fee-value" id="${crypto.id}-high">${formatFee(crypto.fees.high.value, crypto.symbol, currentBaseCurrency)}</div>
                        <div class="fee-time">${crypto.fees.high.time}</div>
                    </div>
                    
                    <div class="fee-item urgent">
                        <div class="fee-label">
                            <span>Urgent Priority</span>
                            <i class="fas fa-bolt"></i>
                        </div>
                        <div class="fee-value" id="${crypto.id}-urgent">${formatFee(crypto.fees.urgent.value, crypto.symbol, currentBaseCurrency)}</div>
                        <div class="fee-time">${crypto.fees.urgent.time}</div>
                    </div>
                </div>
                
                <div class="crypto-stats">
                    <div class="stat-item">
                        <span class="stat-value">${crypto.tps.toLocaleString()}</span>
                        <span class="stat-label">TPS</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${formatMarketCap(crypto.marketCap)}</span>
                        <span class="stat-label">Market Cap</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${getEfficiencyScore(crypto)}%</span>
                        <span class="stat-label">Efficiency</span>
                    </div>
                </div>
            `;
            
            cryptoDashboard.appendChild(card);
        });
        
        // Update network count
        networkCountElement.textContent = cryptocurrencies.length;
    }
    
    // Update all data (simulates fetching from API)
    function updateAllData() {
        updateCount++;
        
        // Update timestamp
        const now = new Date();
        const timeString = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
        lastUpdate.querySelector('span').textContent = `Last update: ${timeString}`;
        updateTimeElement.textContent = `${updateCount * 30}s`;
        
        // Update each cryptocurrency with simulated data changes
        cryptocurrencies.forEach(crypto => {
            updateCryptoData(crypto);
        });
        
        // Update average fee
        updateAverageFee();
        
        // Update congestion level
        updateCongestionLevel();
        
        // Update fastest network
        updateFastestNetwork();
        
        // Show toast notification
        showToast('Data updated successfully!');
    }
    
    // Update a single cryptocurrency's data
    function updateCryptoData(crypto) {
        // Simulate price change
        const priceChange = (Math.random() - 0.5) * 0.5; // -0.25% to +0.25%
        crypto.price *= (1 + priceChange);
        crypto.change = priceChange * 100;
        
        // Simulate fee changes based on network congestion
        const congestionFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        
        Object.keys(crypto.fees).forEach(level => {
            crypto.fees[level].value *= congestionFactor;
            
            // Update the displayed fee
            const feeElement = document.getElementById(`${crypto.id}-${level}`);
            if (feeElement) {
                feeElement.textContent = formatFee(crypto.fees[level].value, crypto.symbol, currentBaseCurrency);
            }
        });
        
        // Update price display
        const card = document.getElementById(`card-${crypto.id}`);
        if (card) {
            const priceValue = card.querySelector('.price-value');
            const priceChangeElement = card.querySelector('.price-change');
            
            if (priceValue) {
                priceValue.textContent = formatCurrency(crypto.price, currentBaseCurrency);
            }
            
            if (priceChangeElement) {
                const changeSign = crypto.change >= 0 ? '+' : '';
                priceChangeElement.textContent = `${changeSign}${crypto.change.toFixed(2)}%`;
                priceChangeElement.className = `price-change ${crypto.change >= 0 ? 'positive' : 'negative'}`;
            }
        }
    }
    
    // Update average fee display
    function updateAverageFee() {
        let totalFees = 0;
        let feeCount = 0;
        
        cryptocurrencies.forEach(crypto => {
            Object.values(crypto.fees).forEach(fee => {
                totalFees += fee.value;
                feeCount++;
            });
        });
        
        const avgFee = totalFees / feeCount;
        avgFeeElement.textContent = formatCurrency(avgFee, currentBaseCurrency);
    }
    
    // Update congestion level
    function updateCongestionLevel() {
        const congestionLevels = ['Low', 'Medium', 'High', 'Extreme'];
        const randomLevel = congestionLevels[Math.floor(Math.random() * congestionLevels.length)];
        
        const congestionElement = document.getElementById('congestion-level');
        const meterElement = document.getElementById('congestion-meter');
        
        if (congestionElement) {
            congestionElement.textContent = randomLevel;
            
            // Update meter based on level
            let meterWidth = 25;
            if (randomLevel === 'Medium') meterWidth = 50;
            if (randomLevel === 'High') meterWidth = 75;
            if (randomLevel === 'Extreme') meterWidth = 95;
            
            if (meterElement) {
                meterElement.style.width = `${meterWidth}%`;
            }
        }
    }
    
    // Update fastest network
    function updateFastestNetwork() {
        // Find crypto with lowest medium fee time (simplified)
        let fastestCrypto = cryptocurrencies[0];
        let fastestTime = 999;
        
        cryptocurrencies.forEach(crypto => {
            // Extract numeric time from string like "5-10 min"
            const timeStr = crypto.fees.medium.time;
            const timeMatch = timeStr.match(/(\d+)/);
            if (timeMatch) {
                const timeNum = parseInt(timeMatch[1]);
                if (timeNum < fastestTime) {
                    fastestTime = timeNum;
                    fastestCrypto = crypto;
                }
            }
        });
        
        const fastestNetworkElement = document.getElementById('fastest-network');
        const avgSpeedElement = document.getElementById('avg-speed');
        const fastestCostElement = document.getElementById('fastest-cost');
        
        if (fastestNetworkElement) {
            fastestNetworkElement.textContent = fastestCrypto.name;
        }
        
        if (avgSpeedElement) {
            avgSpeedElement.textContent = fastestCrypto.fees.medium.time;
        }
        
        if (fastestCostElement) {
            fastestCostElement.textContent = formatFee(fastestCrypto.fees.medium.value, fastestCrypto.symbol, currentBaseCurrency);
        }
    }
    
    // Initialize chart for efficiency
    function initializeChart() {
        const ctx = document.getElementById('efficiencyChart').getContext('2d');
        
        efficiencyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1m', '5m', '10m', '15m', '20m', '25m', '30m'],
                datasets: [{
                    label: 'Fee Efficiency',
                    data: [65, 72, 70, 78, 75, 80, 78],
                    borderColor: '#36D1DC',
                    backgroundColor: 'rgba(54, 209, 220, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    y: {
                        min: 50,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
        
        // Update efficiency score
        const efficiencyScoreElement = document.getElementById('efficiency-score');
        if (efficiencyScoreElement) {
            efficiencyScoreElement.textContent = '78%';
        }
    }
    
    // Format currency based on selected base
    function formatCurrency(amount, currency) {
        if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
            const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '£';
            const convertedAmount = amount * exchangeRates[currency];
            
            if (convertedAmount >= 1) {
                return `${symbol}${convertedAmount.toFixed(2)}`;
            } else {
                return `${symbol}${convertedAmount.toFixed(4)}`;
            }
        } else {
            // For crypto base currencies
            const convertedAmount = amount * exchangeRates[currency];
            return `${convertedAmount.toFixed(6)} ${currency}`;
        }
    }
    
    // Format fee based on fee type and currency
    function formatFee(amount, cryptoUnit, currency) {
        if (currentFeeType === 'gas' && cryptoUnit === 'ETH') {
            return `${amount.toFixed(0)} GWEI`;
        } else if (currentFeeType === 'sats' && cryptoUnit === 'BTC') {
            return `${(amount * 100000000).toFixed(0)} sats`;
        } else if (currentFeeType === 'relative') {
            // Calculate relative to average
            let totalFees = 0;
            let feeCount = 0;
            
            cryptocurrencies.forEach(crypto => {
                Object.values(crypto.fees).forEach(fee => {
                    totalFees += fee.value;
                    feeCount++;
                });
            });
            
            const avgFee = totalFees / feeCount;
            const relative = (amount / avgFee * 100).toFixed(0);
            return `${relative}% of avg`;
        } else {
            // Absolute values
            return formatCurrency(amount, currency);
        }
    }
    
    // Format market cap
    function formatMarketCap(marketCap) {
        if (marketCap >= 1000000000000) {
            return `$${(marketCap / 1000000000000).toFixed(1)}T`;
        } else if (marketCap >= 1000000000) {
            return `$${(marketCap / 1000000000).toFixed(1)}B`;
        } else if (marketCap >= 1000000) {
            return `$${(marketCap / 1000000).toFixed(1)}M`;
        } else {
            return `$${marketCap.toFixed(0)}`;
        }
    }
    
    // Calculate efficiency score
    function getEfficiencyScore(crypto) {
        // Simple efficiency calculation based on TPS and fees
        const tpsScore = Math.min(crypto.tps / 100, 100);
        const feeScore = 100 - (crypto.fees.medium.value * 10);
        const efficiency = (tpsScore * 0.6 + Math.max(feeScore, 0) * 0.4) * 0.9 + Math.random() * 10;
        return Math.min(Math.round(efficiency), 99);
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Base currency change
        baseCurrencySelect.addEventListener('change', function() {
            currentBaseCurrency = this.value;
            updateAllData();
        });
        
        // Fee type change
        feeTypeSelect.addEventListener('change', function() {
            currentFeeType = this.value;
            updateAllData();
        });
        
        // Auto-refresh toggle
        autoRefreshToggle.addEventListener('change', function() {
            autoRefreshEnabled = this.checked;
            
            if (autoRefreshEnabled) {
                startAutoRefresh();
                refreshStatus.textContent = 'ON (30s)';
            } else {
                stopAutoRefresh();
                refreshStatus.textContent = 'OFF';
            }
        });
        
        // Manual refresh button
        manualRefreshBtn.addEventListener('click', function() {
            // Show loading state
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            this.disabled = true;
            
            // Update data
            updateAllData();
            
            // Reset button after delay
            setTimeout(() => {
                this.innerHTML = '<i class="fas fa-redo"></i> Refresh Now';
                this.disabled = false;
            }, 1000);
        });
        
        // Export data button
        exportDataBtn.addEventListener('click', function() {
            showToast('Data exported successfully!');
            // In a real app, this would trigger a download
        });
        
        // View buttons
        viewButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                viewButtons.forEach(btn => btn.classList.remove('active'));
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Update view
                currentView = this.dataset.view;
                updateView();
            });
        });
        
        // Toast close button
        toastClose.addEventListener('click', function() {
            toast.classList.remove('show');
        });
        
        // Close toast automatically after 5 seconds
        toast.addEventListener('transitionend', function() {
            if (this.classList.contains('show')) {
                setTimeout(() => {
                    this.classList.remove('show');
                }, 5000);
            }
        });
    }
    
    // Update view based on selected view mode
    function updateView() {
        const cards = document.querySelectorAll('.crypto-card');
        
        cards.forEach(card => {
            card.dataset.view = currentView;
            
            if (currentView === 'list') {
                card.style.maxWidth = '100%';
            } else if (currentView === 'compact') {
                card.querySelector('.crypto-stats').style.display = 'none';
            } else {
                card.style.maxWidth = '';
                card.querySelector('.crypto-stats').style.display = 'flex';
            }
        });
    }
    
    // Start auto-refresh interval
    function startAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        
        refreshInterval = setInterval(updateAllData, 30000); // 30 seconds
    }
    
    // Stop auto-refresh
    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }
    
    // Show toast notification
    function showToast(message) {
        const toastMessage = toast.querySelector('.toast-message');
        toastMessage.textContent = message;
        toast.classList.add('show');
    }
    
    // Hide loading overlay
    function hideLoadingOverlay() {
        setTimeout(() => {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }, 1000);
    }
    
    // Initialize the application
    init();
});