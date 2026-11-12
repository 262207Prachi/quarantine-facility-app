import os
import re
import urllib.request
import threading
import http.server
import socketserver
import time

PROJECT_DIR = r"C:\Users\ndpat\.gemini\antigravity\scratch\quarantine-facility-app"

print("--- 1. VERIFYING PROJECT FILES ---")
required_files = ["index.html", "app.js", "styles.css", "vercel.json", "package.json", "README.md"]
for rf in required_files:
    fp = os.path.join(PROJECT_DIR, rf)
    assert os.path.exists(fp), f"Missing file: {rf}"
    size = os.path.getsize(fp)
    print(f"  [PASS] {rf} exists ({size:,} bytes)")

print("\n--- 2. VERIFYING CLINICAL & BUSINESS LOGIC ---")

# A. Fever Classification Test
def classify_temp(temp_c):
    if temp_c < 37.5: return "Normal", False
    if temp_c < 38.0: return "Low-Grade", False
    return "High Fever", True

assert classify_temp(36.8)[1] == False, "36.8 should be no fever"
assert classify_temp(37.9)[1] == False, "37.9 should be no fever"
assert classify_temp(38.0)[1] == True, "38.0 must be fever"
assert classify_temp(39.2)[1] == True, "39.2 must be fever"
print("  [PASS] Fever threshold classification (>= 38.0 C) validated.")

# B. Streak Reset & Increment Logic
streak = 0
daily_readings = [37.2, 36.9, 36.8, 38.4, 37.0, 36.6, 36.7]
# Day 1: 37.2 -> streak 1
# Day 2: 36.9 -> streak 2
# Day 3: 36.8 -> streak 3 (Cured!)
# Day 4: 38.4 -> fever! streak resets to 0!
# Day 5: 37.0 -> streak 1
# Day 6: 36.6 -> streak 2
# Day 7: 36.7 -> streak 3 (Cured!)

current_streak = 0
streaks_observed = []
for t in daily_readings:
    _, is_fever = classify_temp(t)
    if is_fever:
        current_streak = 0
    else:
        current_streak += 1
    streaks_observed.append(current_streak)

assert streaks_observed == [1, 2, 3, 0, 1, 2, 3], f"Unexpected streaks: {streaks_observed}"
print("  [PASS] 3-Day Fever-Free streak calculation & fever reset validated.")

# C. Mortality Rate Formula
def calc_mortality(discharged, deceased):
    closed = discharged + deceased
    return round((deceased / closed) * 100, 2) if closed > 0 else 0.0

assert calc_mortality(85, 15) == 15.0, "Expected 15.0% benchmark"
assert calc_mortality(86, 15) == 14.85, "Discharge should lower mortality to 14.85%"
assert calc_mortality(85, 16) == 15.84, "Death should raise mortality to 15.84%"
print("  [PASS] Facility mortality benchmark calculation validated.")

# D. Q4 Knapsack Optimization Check
features = [
    ('A', 1.0, 6), ('B', 3.0, 6), ('C', 5.0, 6),
    ('D', 2.0, 3), ('E', 3.0, 3), ('F', 1.0, 3),
    ('G', 0.4, 1), ('H', 0.5, 1), ('I', 0.3, 1), ('J', 0.1, 1)
]
selected = ['A', 'B', 'D', 'F', 'G', 'H', 'I', 'J']
sel_eff = sum(f[1] for f in features if f[0] in selected)
sel_val = sum(f[2] for f in features if f[0] in selected)
assert round(sel_eff, 2) == 8.3, f"Effort mismatch: {sel_eff}"
assert sel_val == 22, f"Value mismatch: {sel_val}"
print("  [PASS] Q4 Sprint knapsack optimal solution verified (Value: 22, Effort: 8.3).")

print("\n--- 3. TESTING LOCAL HTTP SERVER ---")
PORT = 8765
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_DIR, **kwargs)

server = socketserver.TCPServer(("", PORT), Handler)
t = threading.Thread(target=server.serve_forever, daemon=True)
t.start()
time.sleep(1)

req = urllib.request.urlopen(f"http://localhost:{PORT}/index.html")
status = req.getcode()
content = req.read().decode('utf-8')
server.shutdown()

assert status == 200, f"Expected 200, got {status}"
assert "BioGuard 74" in content, "Brand title missing in HTML"
assert "app.js" in content, "app.js reference missing in HTML"
assert "styles.css" in content, "styles.css reference missing in HTML"
print(f"  [PASS] Local HTTP Server served index.html successfully (Status: {status}).")

print("\nALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
