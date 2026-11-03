"""Live E2E verification of Phase 2 features against the running backend."""
import io
import json
import urllib.request

BASE = "http://127.0.0.1:8000"


def get(u):
    with urllib.request.urlopen(BASE + u, timeout=20) as r:
        return json.loads(r.read())


def post_json(u, payload):
    req = urllib.request.Request(
        BASE + u,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f" | {detail}" if detail else ""))


# 1. Health
h = get("/api/health")
print("health:", h["status"], "| model_loaded:", h["model_loaded"], "| demo:", h["demo_mode"])

# 2. Stats endpoint (honest note + shape)
st = get("/api/history/stats")
print("stats: total=%s" % st.get("total_scans"))
assert st.get("note"), "stats note missing"

# 3. Real prediction via probe image -> lands in history
probe = open("tests/probe_set/author_sample_apple_scab.jpg", "rb").read()
boundary = "----e2eboundary"
body = (
    f"--{boundary}\r\nContent-Disposition: form-data; name=\"image\"; filename=\"probe.jpg\"\r\n"
    f"Content-Type: image/jpeg\r\n\r\n"
).encode() + probe + f"\r\n--{boundary}--\r\n".encode()
req = urllib.request.Request(
    BASE + "/api/predict",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST",
)
pred = json.loads(urllib.request.urlopen(req, timeout=60).read())
print("PREDICT status:", pred.get("status"), "| disease:", pred.get("detected_disease"), "| conf:", pred["top_prediction"]["probability"])
results.append(("predict-real", pred.get("live_model") is True))

# 4. History now has >=1 row; stats reflect it
st2 = get("/api/history/stats")
print("stats after predict: total=%s diseased=%s avg=%s" % (st2.get("total_scans"), st2.get("total_diseased"), st2.get("avg_confidence")))
h2 = get("/api/history?limit=5")
print("history total:", h2["total"], "| latest:", h2["items"][0]["disease"] if h2["items"] else None)

# 5. Filtered history
hf = get("/api/history?mode=real&limit=5")
print("filtered (mode=real): total=%s filtered=%s" % (hf["total"], hf.get("filtered")))

# 6. Feedback roundtrip (correct + incorrect w/o detail refused)
fb = post_json("/api/feedback", {"rating": "correct", "predicted_disease": "Apple scab"})
print("feedback POST:", fb["status"], fb["rating"])
r400 = None
try:
    post_json("/api/feedback", {"rating": "incorrect"})
except urllib.error.HTTPError as e:
    r400 = e.code
print("incorrect-without-detail -> HTTP", r400, "(expect 400)")
fb_list = get("/api/feedback")
print("feedback list total:", fb_list["total"], "| first:", fb_list["items"][0]["rating"] if fb_list["items"] else None)

print("DONE")
