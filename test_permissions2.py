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

def create_event(token, event_data):
    data = json.dumps(event_data).encode()
    req = urllib.request.Request(
        f"{BASE_URL}/api/events",
        data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST"
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

admin = login("admin", "admin123")
suqing = login("suqing", "user123")

print("=== 创建一个非公开的内部事件 ===")
internal_event = create_event(admin["token"], {
    "title": "机密行动-绝密任务",
    "type": "侦察",
    "level": "S级",
    "date": "2024-03-01",
    "location": "秘密地点",
    "description": "这是一个非公开的内部事件，只有管理员和参与角色可见",
    "isPublic": False,
    "characterIds": [1]
})
print(f"创建成功: {internal_event['title']} (公开: {internal_event['isPublic']})")

print()
print("=== 管理员获取所有事件 ===")
admin_events = get_events(admin["token"])
print(f"管理员获取到 {len(admin_events)} 个事件")
for e in admin_events:
    print(f"  - {e['title']} (公开: {e['isPublic']})")

print()
print("=== 普通用户(苏晴)获取事件列表 ===")
suqing_events = get_events(suqing["token"])
print(f"苏晴获取到 {len(suqing_events)} 个事件")
for e in suqing_events:
    print(f"  - {e['title']} (公开: {e['isPublic']})")

print()
print("=== 普通用户(苏晴)尝试访问非公开事件详情 ===")
result, status = get_event_detail(suqing["token"], internal_event["id"])
print(f"HTTP状态码: {status}")
print(f"结果: {result}")

print()
print("=== 管理员访问非公开事件详情 ===")
result, status = get_event_detail(admin["token"], internal_event["id"])
print(f"HTTP状态码: {status}")
print(f"结果: {result['title']} - 访问成功")
