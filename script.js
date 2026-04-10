const ICONS = {
    skull: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 10L9.01 10"/><path d="M15 10L15.01 10"/><path d="M12 2a8 8 0 0 0-8 8v1a5 5 0 0 0 5 5v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4a5 5 0 0 0 5-5v-1a8 8 0 0 0-8-8z"/><path d="M10 22h4"/></svg>`,
    router: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="14" width="20" height="8" rx="2"/><circle cx="6" cy="18" r="1"/><circle cx="10" cy="18" r="1"/><path d="M14 18h4"/><path d="M20 14l-3-6h-10l-3 6"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
    pc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
};

const POSITIONS = {
    hacker:   { left: 20,  top: 80 },
    router:   { left: 160, top: 80 },
    firewall: { left: 300, top: 80 },
    server:   { left: 440, top: 30 },
    pc:       { left: 440, top: 130 }
};

const DEFAULT_TOPOLOGY = {
    devices: [
        { id: "hacker", label: "Hacker", ip: "10.0.0.99", icon: "skull" },
        { id: "router", label: "Router", ip: "10.0.0.1", icon: "router" },
        { id: "firewall", label: "Firewall", ip: "192.168.1.1", icon: "shield" },
        { id: "server", label: "Server", ip: "192.168.1.20", icon: "server" },
        { id: "pc", label: "PC", ip: "192.168.1.10", icon: "pc" }
    ],
    connections: [["hacker", "router"], ["router", "firewall"], ["firewall", "server"], ["firewall", "pc"]]
};

const DEFAULT_RULES = [
    { id: "r1", name: "SSH Guard", type: "login_threshold", port: 22, threshold: 5, protocol: "TCP", action: "Block+Alert", severity: "Critical" },
    { id: "r2", name: "ICMP Guard", type: "icmp_flood", threshold: 20, protocol: "ICMP", action: "Block+Alert", severity: "High" },
    { id: "r3", name: "Port Scan Guard", type: "rate_limit", threshold: 100, protocol: "TCP", action: "Alert", severity: "Medium" }
];

let learningMode = false;
let lastAlerts = [];

// Storage Helpers
function getRules() {
    const rules = localStorage.getItem('cs_simulator_rules');
    return rules ? JSON.parse(rules) : DEFAULT_RULES;
}

function saveRules(rules) {
    localStorage.setItem('cs_simulator_rules', JSON.stringify(rules));
}

async function init() {
    renderTopology();
    await loadRules();
    setupEventListeners();
}

function renderTopology() {
    const container = document.getElementById('diagram');
    container.innerHTML = '';

    DEFAULT_TOPOLOGY.devices.forEach(dev => {
        const pos = POSITIONS[dev.id];
        const div = document.createElement('div');
        div.className = `device-node ${dev.id === 'hacker' ? 'hacker' : ''}`;
        div.id = `node-${dev.id}`;
        div.style.left = pos.left + 'px';
        div.style.top = pos.top + 'px';
        div.innerHTML = `
            ${ICONS[dev.icon]}
            <div style="font-weight:bold">${dev.label}</div>
            <div style="color:var(--muted)">${dev.ip}</div>
        `;
        container.appendChild(div);
    });

    DEFAULT_TOPOLOGY.connections.forEach(([sid, tid]) => {
        const start = POSITIONS[sid];
        const end = POSITIONS[tid];
        const x1 = start.left + 40, y1 = start.top + 40;
        const x2 = end.left + 40, y2 = end.top + 40;
        const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

        const line = document.createElement('div');
        line.className = 'connection-line';
        line.id = `line-${sid}-${tid}`;
        line.style.width = dist + 'px';
        line.style.left = x1 + 'px';
        line.style.top = y1 + 'px';
        line.style.transform = `rotate(${angle}deg)`;
        container.appendChild(line);
    });
}

async function loadRules() {
    const rules = getRules();
    const list = document.getElementById('rules-list');
    const replaceSelect = document.getElementById('r-replace');

    list.innerHTML = `<div class="panel-title">Active Rules</div>`;
    replaceSelect.innerHTML = `<option value="">-- No Replacement --</option>`;

    rules.forEach(rule => {
        const opt = document.createElement('option');
        opt.value = rule.id; opt.textContent = rule.name;
        replaceSelect.appendChild(opt);

        const div = document.createElement('div');
        div.className = 'card rule-card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <strong>${rule.name}</strong>
                <span style="cursor:pointer; color:var(--red)" onclick="deleteRule('${rule.id}')">&times;</span>
            </div>
            <div style="margin-top:5px; display:flex; gap:5px; flex-wrap:wrap">
                <span class="badge" style="background:var(--accent)">${rule.type}</span>
                <span class="badge" style="background:var(--border)">${rule.protocol}</span>
                <span class="badge badge-sev" data-sev="${rule.severity}">${rule.severity}</span>
            </div>
            <button class="btn-test" onclick="runRuleTest('${rule.type}', ${rule.port})">Test Now</button>
        `;
        list.appendChild(div);
    });
}

async function deleteRule(id) {
    let rules = getRules();
    rules = rules.filter(r => r.id !== id);
    saveRules(rules);
    loadRules();
}

function runRuleTest(type, port) {
    if (type === 'icmp_flood') launchAttack('ping_flood');
    else if (type === 'login_threshold' || (type === 'port_block' && port === 22)) launchAttack('brute_force');
    else launchAttack('port_scan');
}

function setupEventListeners() {
    document.getElementById('rule-form').onsubmit = async (e) => {
        e.preventDefault();
        let rules = getRules();
        
        const replaceId = document.getElementById('r-replace').value;
        if (replaceId) rules = rules.filter(r => r.id !== replaceId);

        const newRule = {
            id: `r${Date.now()}`,
            name: document.getElementById('r-name').value,
            type: document.getElementById('r-type').value,
            port: parseInt(document.getElementById('r-port').value) || null,
            threshold: parseInt(document.getElementById('r-threshold').value) || null,
            protocol: document.getElementById('r-protocol').value,
            action: document.getElementById('r-action').value,
            severity: document.getElementById('r-severity').value
        };

        // Conflict check
        const conflict = rules.find(r => r.port === newRule.port && r.protocol === newRule.protocol);
        if (conflict) {
            alert(`A rule for ${newRule.protocol} port ${newRule.port} already exists.`);
            return;
        }

        rules.push(newRule);
        saveRules(rules);
        document.getElementById('rule-form').reset();
        await loadRules();

        setTimeout(() => {
            const firstRule = document.querySelector('.rule-card:nth-child(2)');
            if (firstRule) firstRule.classList.add('new-rule-glow');
        }, 100);
    };

    document.getElementById('learn-mode').onclick = (e) => {
        learningMode = e.target.checked;
        renderAlerts(lastAlerts);
    };
}

// SIMULATION ENGINE (Ported from Python)
function simulateTraffic(attackType) {
    const rules = getRules();
    let packets = [];
    const src = "10.0.0.99";

    if (attackType === 'port_scan') {
        for (let i = 0; i < 50; i++) packets.push({ port: Math.floor(Math.random() * 1024) + 1, protocol: 'TCP', src });
    } else if (attackType === 'brute_force') {
        for (let i = 0; i < 20; i++) packets.push({ port: 22, protocol: 'TCP', src });
    } else if (attackType === 'ping_flood') {
        for (let i = 0; i < 100; i++) packets.push({ port: null, protocol: 'ICMP', src });
    }

    let alerts = [], blocked = 0, passed = 0, rulesHit = new Set(), counts = {};
    rules.forEach(r => counts[r.id] = 0);

    packets.forEach(pkt => {
        let hitRule = null;
        for (let rule of rules) {
            let match = false;
            if (rule.type === 'port_block') {
                if (pkt.port === rule.port && pkt.protocol === rule.protocol) match = true;
            } else if (rule.type === 'rate_limit') {
                if (pkt.protocol === rule.protocol) {
                    counts[rule.id]++;
                    if (counts[rule.id] > (rule.threshold || 0)) match = true;
                }
            } else if (rule.type === 'icmp_flood') {
                if (pkt.protocol === 'ICMP') {
                    counts[rule.id]++;
                    if (counts[rule.id] > (rule.threshold || 0)) match = true;
                }
            } else if (rule.type === 'login_threshold') {
                if (pkt.port === 22 && pkt.protocol === 'TCP') {
                    counts[rule.id]++;
                    if (counts[rule.id] > (rule.threshold || 0)) match = true;
                }
            }
            if (match) { hitRule = rule; break; }
        }

        if (hitRule) {
            rulesHit.add(hitRule.name);
            const action = hitRule.action || 'Alert';
            if (action.includes('Block')) blocked++; else passed++;
            
            if (alerts.length < 50) {
                alerts.push({
                    timestamp: new Date().toLocaleTimeString(),
                    src: pkt.src, dst: "192.168.1.20", port: pkt.port, protocol: pkt.protocol,
                    rule_name: hitRule.name, severity: hitRule.severity,
                    action: action.includes('Block') ? 'Block' : 'Alert',
                    explanation: `${pkt.src} triggered rule '${hitRule.name}'. Threshold exceeded/Port blocked.`
                });
            }
        } else {
            passed++;
            if (alerts.length < 50 && passed <= 10) {
                alerts.push({
                    timestamp: new Date().toLocaleTimeString(),
                    src: pkt.src, dst: "192.168.1.20", port: pkt.port || '-', protocol: pkt.protocol,
                    rule_name: "N/A", severity: "Info", action: "Allow",
                    explanation: `Packet from ${pkt.src} allowed (no rule matched).`
                });
            }
        }
    });

    return { alerts, total: packets.length, blocked, passed, rules_hit: Array.from(rulesHit), threat_score: packets.length ? Math.round((blocked / packets.length) * 100) : 0 };
}

function createPacket(fromId, toId, type = 'normal') {
    const from = POSITIONS[fromId], to = POSITIONS[toId];
    const packet = document.createElement('div');
    packet.className = `packet packet-${type}`;
    packet.style.left = (from.left + 40) + 'px'; packet.style.top = (from.top + 40) + 'px';
    document.getElementById('diagram').appendChild(packet);
    setTimeout(() => { packet.style.left = (to.left + 40) + 'px'; packet.style.top = (to.top + 40) + 'px'; }, 10);
    setTimeout(() => packet.remove(), 600);
}

async function launchAttack(type) {
    const btns = document.querySelectorAll('.btn-attack');
    btns.forEach(b => b.disabled = true);
    const attackClasses = { 'port_scan': 'attacking-scan', 'brute_force': 'attacking-brute', 'ping_flood': 'attacking-flood' };
    const attackClass = attackClasses[type] || 'attacking-scan';
    const serverNode = document.getElementById('node-server');
    serverNode.classList.add('targeted');
    if (type === 'port_scan') serverNode.classList.add('radar-sweep');
    if (type === 'ping_flood') serverNode.classList.add('shaking');

    const streamInterval = setInterval(() => {
        createPacket('hacker', 'router', 'malicious');
        setTimeout(() => createPacket('router', 'firewall', 'malicious'), 300);
        setTimeout(() => createPacket('firewall', 'server', 'malicious'), 600);
    }, 200);

    const lines = document.querySelectorAll('.connection-line');
    lines.forEach(l => l.classList.add(attackClass));

    // LOCAL SIMULATION instead of fetch
    setTimeout(() => {
        const data = simulateTraffic(type);
        lastAlerts = data.alerts;

        clearInterval(streamInterval);
        lines.forEach(l => l.classList.remove('attacking-scan', 'attacking-brute', 'attacking-flood'));
        serverNode.classList.remove('targeted', 'radar-sweep', 'shaking');
        document.getElementById('node-firewall').classList.add('blocked');
        setTimeout(() => {
            document.getElementById('node-firewall').classList.remove('blocked');
            btns.forEach(b => b.disabled = false);
        }, 1000);
        
        updateSummary(data);
        renderAlerts(data.alerts);
    }, 3000);
}

function updateSummary(data) {
    const scoreColor = data.threat_score > 80 ? 'var(--green)' : (data.threat_score > 50 ? 'var(--amber)' : 'var(--red)');
    document.getElementById('summary-bar').innerHTML = `
        <div>
            <strong>${data.total}</strong> packets analyzed &middot; 
            <span style="color:var(--green)">${data.blocked} blocked</span> &middot; 
            <span style="color:var(--amber)">${data.passed} passed</span>
        </div>
        <div class="threat-score" style="color:${scoreColor}">
            Threat Score: ${data.threat_score}
        </div>
    `;
}

function renderAlerts(alerts) {
    const tbody = document.getElementById('alert-body');
    if (!alerts || alerts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--muted)">No alerts. Launch an attack from the sidebar.</td></tr>`;
        return;
    }
    tbody.innerHTML = '';
    alerts.forEach((a, i) => {
        const tr = document.createElement('tr');
        tr.className = a.action === 'Allow' ? 'severity-allow' : `severity-${a.severity.toLowerCase()}`;
        tr.innerHTML = `<td>${a.timestamp}</td><td>${a.src}</td><td>${a.dst}</td><td>${a.port || '-'}</td><td>${a.protocol}</td><td>${a.rule_name}</td><td>${a.severity}</td><td>${a.action}</td>`;
        tr.onclick = () => toggleDetail(i);
        tbody.appendChild(tr);
        const dtr = document.createElement('tr');
        dtr.id = `detail-${i}`; dtr.className = 'detail-row'; dtr.style.display = learningMode ? 'table-row' : 'none';
        dtr.innerHTML = `<td colspan="8">${a.explanation}</td>`;
        tbody.appendChild(dtr);
    });
}

function toggleDetail(i) {
    const el = document.getElementById(`detail-${i}`);
    el.style.display = el.style.display === 'none' ? 'table-row' : 'none';
}

function exportCSV() {
    if (lastAlerts.length === 0) return;
    const headers = "Time,Src,Dst,Port,Protocol,Rule,Severity,Action,Explanation\n";
    const rows = lastAlerts.map(a => `${a.timestamp},${a.src},${a.dst},${a.port},${a.protocol},${a.rule_name},${a.severity},${a.action},"${a.explanation.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `network_alerts_${Date.now()}.csv`; a.click();
}

function onRuleTypeChange() {
    const type = document.getElementById('r-type').value;
    document.getElementById('r-port').style.display = (type === 'port_block' || type === 'login_threshold') ? 'block' : 'none';
    document.getElementById('r-threshold').style.display = (type !== 'port_block') ? 'block' : 'none';
}

window.onload = init;
