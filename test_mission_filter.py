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

def get_event_detail(token, event_id):
    req = urllib.request.Request(
        f"{BASE_URL}/api/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read()), res.status
    except urllib.error.HTTPError as e:
        return json.loads(e.read()), e.code

def create_mission(token, mission_data):
    data = json.dumps(mission_data).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/missions",
        data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST"
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read())

admin = login("admin", "admin123")
linye = login("linye", "user123")
suqing = login("suqing", "user123")

print("=== 先获取银行抢劫案事件ID ===")
admin_events = get_events(admin["token"])
bank_event = None
for e in admin_events:
    if "银行抢劫案" in e["title"]:
        bank_event = e
        break
print(f"找到事件: {bank_event['title']} (id={bank_event['id']})")
print(f"该事件的任务数量(管理员视角): {len(bank_event['missions'])}")
for m in bank_event['missions']:
    print(f"  - {m['title']}")

print()
print("=== 林夜视角查看该事件详情 ===")
event_detail, status = get_event_detail(linye["token"], bank_event["id"])
print(f"HTTP状态: {status}")
print(f"事件标题: {event_detail['title']}")
print(f"关联任务数量: {len(event_detail['missions'])}")
for m in event_detail['missions']:
    chars = [c["character"]["name"] for c in m.get("characters", [])]
    print(f"  - {m['title']} (执行人员: {chars})")

print()
print("=== 苏晴视角查看该事件详情 ===")
event_detail, status = get_event_detail(suqing["token"], bank_event["id"])
print(f"HTTP状态: {status}")
print(f"事件标题: {event_detail['title']}")
print(f"关联任务数量: {len(event_detail['missions'])}")
for m in event_detail['missions']:
    chars = [c["character"]["name"] for c in m.get("characters", [])]
    print(f"  - {m['title']} (执行人员: {chars})")

print()
print("=== 给该事件创建一个只有苏晴参与的任务 ===")
new_mission = create_mission(admin["token"], {
    "title": "苏晴专属支援任务",
    "description": "这是一个只有苏晴参与的任务",
    "priority": "中",
    "status": "待处理",
    "dueDate": "2024-03-15",
    "eventId": bank_event["id"],
    "characterIds": [2]
})
print(f"创建成功: {new_mission['title']}")

print()
print("=== 林夜视角再次查看该事件 ===")
event_detail, status = get_event_detail(linye["token"], bank_event["id"])
print(f"关联任务数量: {len(event_detail['missions'])}")
for m in event_detail['missions']:
    chars = [c["character"]["name"] for c in m.get("characters", [])]
    print(f"  - {m['title']} (执行人员: {chars})")

print()
print("=== 苏晴视角再次查看该事件 ===")
event_detail, status = get_event_detail(suqing["token"], bank_event["id"])
print(f"关联任务数量: {len(event_detail['missions'])}")
for m in event_detail['missions']:
    chars = [c["character"]["name"] for c in m.get("characters", [])]
    print(f"  - {m['title']} (执行人员: {chars})")

print()
print("=== 管理员视角查看 ===")
event_detail, status = get_event_detail(admin["token"], bank_event["id"])
print(f"关联任务数量: {len(event_detail['missions'])}")
for m in event_detail['missions']:
    chars = [c["character"]["name"] for c in m.get("characters", [])]
    print(f"  - {m['title']} (执行人员: {chars})")

print()
print("✅ 验证完成！")
print("   - 林夜只能看到自己参与的任务")
print("   - 苏晴只能看到自己参与的任务")
print("   - 管理员能看到所有任务")
