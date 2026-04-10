import os
import json
import time
import random
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

# Paths
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
RULES_FILE = os.path.join(DATA_DIR, 'rules.json')
TOPOLOGY_FILE = os.path.join(DATA_DIR, 'topology.json')

def load_json(path):
    with open(path, 'r') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/topology', methods=['GET'])
def get_topology():
    return jsonify(load_json(TOPOLOGY_FILE))

@app.route('/api/rules', methods=['GET', 'POST'])
def handle_rules():
    rules = load_json(RULES_FILE)
    if request.method == 'POST':
        new_rule = request.json
        # Rule conflict check
        for rule in rules:
            if rule.get('port') == new_rule.get('port') and rule.get('protocol') == new_rule.get('protocol'):
                return jsonify({"warning": f"A rule for {new_rule.get('protocol')} port {new_rule.get('port')} already exists."}), 200
        
        new_rule['id'] = f"r{int(time.time())}"
        rules.append(new_rule)
        save_json(RULES_FILE, rules)
        return jsonify(rules), 201
    return jsonify(rules)

@app.route('/api/rules/<rule_id>', methods=['DELETE'])
def delete_rule(rule_id):
    rules = load_json(RULES_FILE)
    rules = [r for r in rules if r['id'] != rule_id]
    save_json(RULES_FILE, rules)
    return jsonify({"success": True})

@app.route('/api/simulate', methods=['POST'])
def simulate():
    data = request.json
    attack_type = data.get('attack')
    target = data.get('target', 'server')
    rules = load_json(RULES_FILE)
    
    packets = []
    if attack_type == 'port_scan':
        # 50 packets, random ports 1-1024, TCP, src=10.0.0.99
        for _ in range(50):
            packets.append({'port': random.randint(1, 1024), 'protocol': 'TCP', 'src': '10.0.0.99'})
    elif attack_type == 'brute_force':
        # 20 packets, all port 22, TCP, src=10.0.0.99
        for _ in range(20):
            packets.append({'port': 22, 'protocol': 'TCP', 'src': '10.0.0.99'})
    elif attack_type == 'ping_flood':
        # 100 packets, no port, ICMP, src=10.0.0.99
        for _ in range(100):
            packets.append({'port': None, 'protocol': 'ICMP', 'src': '10.0.0.99'})

    alerts = []
    blocked_count = 0
    passed_count = 0
    rules_hit = set()

    # Track packet counts per rule for threshold logic
    counts = {rule['id']: 0 for rule in rules}

    for pkt in packets:
        hit_rule = None
        for rule in rules:
            match = False
            r_type = rule['type']
            
            if r_type == 'port_block':
                if pkt['port'] == rule.get('port') and pkt['protocol'] == rule.get('protocol'):
                    match = True
            elif r_type == 'rate_limit':
                if pkt['protocol'] == rule.get('protocol'):
                    counts[rule['id']] += 1
                    if counts[rule['id']] > rule.get('threshold', 0):
                        match = True
            elif r_type == 'icmp_flood':
                if pkt['protocol'] == 'ICMP':
                    counts[rule['id']] += 1
                    if counts[rule['id']] > rule.get('threshold', 0):
                        match = True
            elif r_type == 'login_threshold':
                if pkt['port'] == 22 and pkt['protocol'] == 'TCP':
                    counts[rule['id']] += 1
                    if counts[rule['id']] > rule.get('threshold', 0):
                        match = True

            if match:
                hit_rule = rule
                break
        
        if hit_rule:
            rules_hit.add(hit_rule['name'])
            action = hit_rule.get('action', 'Alert')
            if 'Block' in action:
                blocked_count += 1
            else:
                passed_count += 1
            
            # Generate alert object for specific packets (limiting to avoid massive payloads)
            if len(alerts) < 50:
                alerts.append({
                    "timestamp": time.strftime("%H:%M:%S"),
                    "src": pkt['src'],
                    "dst": "192.168.1.20",
                    "port": pkt['port'],
                    "protocol": pkt['protocol'],
                    "rule_name": hit_rule['name'],
                    "severity": hit_rule['severity'],
                    "action": "Block" if "Block" in action else "Alert",
                    "explanation": f"{pkt['src']} triggered rule '{hit_rule['name']}' ({hit_rule['type']}). Threshold exceeded/Port blocked."
                })
        else:
            passed_count += 1
            # Show a few passed packets for visibility (limit to avoid log spam)
            if len(alerts) < 50 and passed_count <= 10:
                alerts.append({
                    "timestamp": time.strftime("%H:%M:%S"),
                    "src": pkt['src'],
                    "dst": "192.168.1.20",
                    "port": pkt['port'],
                    "protocol": pkt['protocol'],
                    "rule_name": "N/A",
                    "severity": "Info",
                    "action": "Allow",
                    "explanation": f"Packet from {pkt['src']} to {pkt['protocol']} port {pkt['port']} was allowed (no rule matched)."
                })

    total = len(packets)
    threat_score = round((blocked_count / total) * 100) if total > 0 else 0

    return jsonify({
        "alerts": alerts,
        "total": total,
        "blocked": blocked_count,
        "passed": passed_count,
        "rules_hit": list(rules_hit),
        "threat_score": threat_score
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
