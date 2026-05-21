// Custom Radar Chart Implementation for IB CS IA
// Demonstrates understanding of trigonometry and canvas rendering

class RadarChart {
    constructor(canvasId, data, options = {}) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = data; // { labels: [], values: [] }
        this.options = Object.assign({
            max: 100,
            lineColor: 'rgba(54, 162, 235, 1)',
            fillColor: 'rgba(54, 162, 235, 0.2)',
            pointColor: '#fff',
            font: '14px Arial',
            textColor: '#666'
        }, options);
        
        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        // 减少半径 留出足够空间给 labels
        this.radius = Math.min(this.centerX, this.centerY) - 60;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.drawGrid();
        this.drawData();
    }

    drawGrid() {
        const count = this.data.labels.length;
        const step = (Math.PI * 2) / count;
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.fillStyle = this.options.textColor;
        this.ctx.font = this.options.font;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw concentric circles (webs)
        for (let r = 0.2; r <= 1.0; r += 0.2) {
            this.ctx.beginPath();
            for (let i = 0; i < count; i++) {
                const angle = i * step - Math.PI / 2;
                const x = this.centerX + Math.cos(angle) * this.radius * r;
                const y = this.centerY + Math.sin(angle) * this.radius * r;
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }

        // Draw axes and labels with adjusted positioning
        for (let i = 0; i < count; i++) {
            const angle = i * step - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * this.radius;
            const y = this.centerY + Math.sin(angle) * this.radius;
            
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(x, y);
            this.ctx.strokeStyle = '#ccc';
            this.ctx.stroke();

            // Labels with extra padding (40 pixels from radius)
            const labelDistance = this.radius + 40;
            const labelX = this.centerX + Math.cos(angle) * labelDistance;
            const labelY = this.centerY + Math.sin(angle) * labelDistance;
            this.ctx.fillText(this.data.labels[i], labelX, labelY);
        }
    }

    drawData() {
        const count = this.data.labels.length;
        const step = (Math.PI * 2) / count;
        
        this.ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const val = Math.max(0, Math.min(this.data.values[i], this.options.max));
            const r = (val / this.options.max) * this.radius;
            const angle = i * step - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * r;
            const y = this.centerY + Math.sin(angle) * r;
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = this.options.lineColor;
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = this.options.fillColor;
        this.ctx.fill();
        this.ctx.stroke();

        // Draw points
        for (let i = 0; i < count; i++) {
            const val = Math.max(0, Math.min(this.data.values[i], this.options.max));
            const r = (val / this.options.max) * this.radius;
            const angle = i * step - Math.PI / 2;
            const x = this.centerX + Math.cos(angle) * r;
            const y = this.centerY + Math.sin(angle) * r;

            this.ctx.beginPath();
            this.ctx.arc(x, y, 4, 0, Math.PI * 2);
            this.ctx.fillStyle = this.options.pointColor;
            this.ctx.fill();
            this.ctx.strokeStyle = this.options.lineColor;
            this.ctx.stroke();
        }
    }
}
