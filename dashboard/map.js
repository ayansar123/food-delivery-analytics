// Live Dispatch Fleet Telemetry Map Simulator (v4)

class DispatchMap {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.drivers = [];
        this.hubs = [];
        this.customers = [];
        this.animationId = null;
        this.hoveredDriver = null;
        
        // Resize canvas to match display size
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Define Restaurant Hubs
        this.hubs = [
            { id: 1, name: "Sakura Sushi", x: 120, y: 100, cuisine: "Asian", color: "#10b981" },
            { id: 2, name: "Bella Italia", x: 500, y: 90, cuisine: "Italian", color: "#a855f7" },
            { id: 3, name: "Smash & Go", x: 300, y: 220, cuisine: "Burgers", color: "#ec4899" },
            { id: 4, name: "Taj Mahal", x: 680, y: 260, cuisine: "Indian", color: "#f59e0b" },
            { id: 5, name: "Green Leaf Cafe", x: 180, y: 320, cuisine: "Healthy", color: "#8b5cf6" }
        ];
        
        // Define Customer Node positions
        this.customers = [
            { id: 1, name: "John D.", x: 60, y: 40 },
            { id: 2, name: "Mary S.", x: 260, y: 60 },
            { id: 3, name: "Robert T.", x: 420, y: 40 },
            { id: 4, name: "Linda K.", x: 620, y: 50 },
            { id: 5, name: "David M.", x: 740, y: 110 },
            { id: 6, name: "Sarah J.", x: 80, y: 210 },
            { id: 7, name: "William B.", x: 220, y: 180 },
            { id: 8, name: "Elizabeth P.", x: 480, y: 190 },
            { id: 9, name: "Richard H.", x: 640, y: 170 },
            { id: 10, name: "Joseph C.", x: 420, y: 290 },
            { id: 11, name: "Jennifer W.", x: 560, y: 340 },
            { id: 12, name: "Charles F.", x: 720, y: 330 },
            { id: 13, name: "Patricia D.", x: 100, y: 350 },
            { id: 14, name: "Thomas G.", x: 340, y: 350 }
        ];
        
        // Spawn 6 Active Drivers
        const driverNames = ["Carlos", "Elena", "Marcus", "Sarah", "David", "Chloe"];
        const vehicles = ["Car", "Scooter", "Bike", "Scooter", "Car", "Bike"];
        
        for (let i = 0; i < 6; i++) {
            this.drivers.push(this.createNewDelivery(driverNames[i], vehicles[i]));
        }
        
        // Mouse Listeners
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Start Loop
        this.start();
    }
    
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width || 800;
        this.canvas.height = 380;
    }
    
    createNewDelivery(name, vehicle) {
        const hub = this.hubs[Math.floor(Math.random() * this.hubs.length)];
        const customer = this.customers[Math.floor(Math.random() * this.customers.length)];
        const amount = (12.50 + Math.random() * 45).toFixed(2);
        
        let speed = 0.8;
        let color = "#a855f7"; // Purple (Bike)
        if (vehicle === "Car") {
            speed = 2.0;
            color = "#f43f5e"; // Rose (Car)
        } else if (vehicle === "Scooter") {
            speed = 1.4;
            color = "#f59e0b"; // Amber (Scooter)
        }
        
        // Waypoints (Restaurant -> Street Node -> Customer)
        const waypoints = [
            { x: hub.x, y: hub.y },
            { x: hub.x, y: customer.y }, // Horizontal/Vertical street pathing
            { x: customer.x, y: customer.y }
        ];
        
        return {
            name: name,
            vehicle: vehicle,
            speed: speed,
            color: color,
            amount: amount,
            restaurant: hub.name,
            customer: customer.name,
            x: hub.x,
            y: hub.y,
            waypoints: waypoints,
            currentWaypointIndex: 0,
            status: "En Route to Pickup",
            progress: 0,
            waiting: 0
        };
    }
    
    start() {
        const loop = () => {
            this.update();
            this.draw();
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    }
    
    stop() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
    }
    
    update() {
        // Only simulate if operations tab is visible
        const operationsTab = document.getElementById("tab-operations");
        if (!operationsTab || !operationsTab.classList.contains("active")) return;
        
        this.drivers.forEach(d => {
            if (d.waiting > 0) {
                d.waiting--;
                if (d.waiting === 0) {
                    // Respawn a new route
                    const replacement = this.createNewDelivery(d.name, d.vehicle);
                    Object.assign(d, replacement);
                }
                return;
            }
            
            const target = d.waypoints[d.currentWaypointIndex];
            if (!target) return;
            
            const dx = target.x - d.x;
            const dy = target.y - d.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < d.speed + 1) {
                d.x = target.x;
                d.y = target.y;
                d.currentWaypointIndex++;
                
                if (d.currentWaypointIndex >= d.waypoints.length) {
                    // Reached Customer!
                    d.status = "Delivered";
                    d.waiting = 180; // Wait 3 seconds
                    
                    // Dispatch notification to UI feed
                    if (window.addDispatchLog) {
                        window.addDispatchLog({
                            type: 'success',
                            title: `Order Completed by ${d.name}`,
                            desc: `${d.vehicle} arrived at ${d.customer}. GMV: ${window.currencySymbol || '$'}${d.amount}.`,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        });
                    }
                } else if (d.currentWaypointIndex === 1) {
                    d.status = "Picked Up Order";
                } else {
                    d.status = "Out for Delivery";
                }
            } else {
                d.x += (dx / dist) * d.speed;
                d.y += (dy / dist) * d.speed;
            }
        });
    }
    
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const isLightTheme = document.body.classList.contains("light-theme");
        const streetColor = isLightTheme ? "#e2e8f0" : "#27272a";
        const gridColor = isLightTheme ? "#f1f5f9" : "#1e1e24";
        
        // Draw Streets/Grid Lines (Simulated Grid Map)
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;
        const gridGap = 40;
        for (let x = 0; x < this.canvas.width; x += gridGap) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y < this.canvas.height; y += gridGap) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        // Draw Grid Streets
        this.ctx.strokeStyle = streetColor;
        this.ctx.lineWidth = 4;
        this.hubs.forEach(h => {
            this.customers.forEach(c => {
                if (Math.abs(h.x - c.x) < 150 || Math.abs(h.y - c.y) < 100) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(h.x, h.y);
                    this.ctx.lineTo(h.x, c.y);
                    this.ctx.lineTo(c.x, c.y);
                    this.ctx.stroke();
                }
            });
        });
        
        // Draw Customer Nodes
        this.customers.forEach(c => {
            this.ctx.fillStyle = isLightTheme ? "#94a3b8" : "#3f3f46";
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
        
        // Draw Restaurant Hubs
        this.hubs.forEach(h => {
            // Glow
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = h.color;
            
            this.ctx.fillStyle = h.color;
            this.ctx.beginPath();
            this.ctx.arc(h.x, h.y, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Outer ring
            this.ctx.strokeStyle = isLightTheme ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(h.x, h.y, 14, 0, Math.PI * 2);
            this.ctx.stroke();
            
            this.ctx.shadowBlur = 0; // Reset
            
            // Label
            this.ctx.fillStyle = isLightTheme ? "#0f172a" : "#f8fafc";
            this.ctx.font = "bold 9px 'Plus Jakarta Sans'";
            this.ctx.textAlign = "center";
            this.ctx.fillText(h.name, h.x, h.y - 20);
        });
        
        // Draw Deliveries (Drivers)
        this.drivers.forEach(d => {
            if (d.status === "Delivered") return; // Waiting in customer house (hidden)
            
            // Shadow Glow
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = d.color;
            
            // Driver Vehicle Marker
            this.ctx.fillStyle = d.color;
            this.ctx.beginPath();
            this.ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.shadowBlur = 0; // Reset
            
            // Draw path lines
            if (d === this.hoveredDriver) {
                this.ctx.strokeStyle = d.color;
                this.ctx.lineWidth = 1;
                this.ctx.setLineDash([4, 4]);
                this.ctx.beginPath();
                this.ctx.moveTo(d.x, d.y);
                const nextWaypoint = d.waypoints[d.currentWaypointIndex];
                if (nextWaypoint) {
                    this.ctx.lineTo(nextWaypoint.x, nextWaypoint.y);
                    for (let j = d.currentWaypointIndex + 1; j < d.waypoints.length; j++) {
                        this.ctx.lineTo(d.waypoints[j].x, d.waypoints[j].y);
                    }
                }
                this.ctx.stroke();
                this.ctx.setLineDash([]); // Reset
            }
            
            // Initial/Icon label
            this.ctx.fillStyle = isLightTheme ? "#0f172a" : "#f8fafc";
            this.ctx.font = "500 8px 'Plus Jakarta Sans'";
            this.ctx.textAlign = "left";
            this.ctx.fillText(` ${d.name} (${d.vehicle[0]})`, d.x + 8, d.y + 3);
        });
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        let found = null;
        
        // Detect hovering over drivers
        for (let d of this.drivers) {
            if (d.status === "Delivered") continue;
            
            const dx = d.x - mouseX;
            const dy = d.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 12) {
                found = d;
                break;
            }
        }
        
        this.hoveredDriver = found;
        const tooltip = document.getElementById("map-tooltip");
        
        if (found) {
            this.canvas.style.cursor = 'pointer';
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX - rect.left + 15}px`;
            tooltip.style.top = `${e.clientY - rect.top + 15}px`;
            
            const symbol = window.currencySymbol || "$";
            tooltip.innerHTML = `
                <div style="font-weight: 700; margin-bottom: 4px; color: var(--primary);">👤 Driver ${found.name}</div>
                <div style="font-size: 11px; margin-bottom: 2px;"><b>Vehicle:</b> ${found.vehicle}</div>
                <div style="font-size: 11px; margin-bottom: 2px;"><b>From:</b> ${found.restaurant}</div>
                <div style="font-size: 11px; margin-bottom: 2px;"><b>To:</b> ${found.customer}</div>
                <div style="font-size: 11px; margin-bottom: 2px;"><b>Value:</b> ${symbol}${found.amount}</div>
                <div style="font-size: 11px; color: ${found.color};"><b>Status:</b> ${found.status}</div>
            `;
        } else {
            this.canvas.style.cursor = 'default';
            tooltip.style.display = 'none';
        }
    }
}

// Global hook
let globalMapInstance = null;
window.initDispatchMap = function() {
    if (globalMapInstance) {
        globalMapInstance.stop();
    }
    globalMapInstance = new DispatchMap("dispatch-map");
};
