import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3001"

def login(username, password):
    data = json.dumps({"username": username, "password": password}).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/login",
        data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

def get_events(token):
    req = urllib.request.Request(
        f"{BASE_URL}/api/events",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

def get_missions(token):
    req = urllib.request.Request(
        f"{BASE_URL}/api/missions",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

admin = login("admin", "admin123")
linye = login("linye", "user123")

print("=== 管理员获取事件列表 ===")
admin_events = get_events(admin["token"])
print(f"管理员获取到 {len(admin_events)} 个事件")
for e in admin_events:
    print(f"  - {e['title']} (公开: {e['isPublic']})")

print()
print("=== 普通用户(林夜)获取事件列表 ===")
linye_events = get_events(linye["token"])
print(f"普通用户获取到 {len(linye_events)} 个事件")
for e in linye_events:
    print(f"  - {e['title']} (公开: {e['isPublic']})")

print()
print("=== 管理员获取任务列表 ===")
admin_missions = get_missions(admin["token"])
print(f"管理员获取到 {len(admin_missions)} 个任务")
for m in admin_missions:
    chars = [c["character"]["name"] for c in m["characters"]]
    print(f"  - {m['title']} (执行人员: {chars})")

print()
print("=== 普通用户(林夜)获取任务列表 ===")
linye_missions = get_missions(linye["token"])
print(f"普通用户获取到 {len(linye_missions)} 个任务")
for m in linye_missions:
    chars = [c["character"]["name"] for c in m["characters"]]
    print(f"  - {m['title']} (执行人员: {chars})")
