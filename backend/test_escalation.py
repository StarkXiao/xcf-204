import requests
import json

BASE_URL = "http://localhost:3001/api"
TOKEN = ""

def login():
    global TOKEN
    r = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    TOKEN = r.json()["token"]
    print(f"✅ 登录成功: {TOKEN[:30]}...")

def headers():
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

def test_level_escalation(event_id):
    print(f"\n{'='*60}")
    print(f"测试 1: 事件等级升级 (事件 ID: {event_id})")
    print(f"{'='*60}")

    r = requests.get(f"{BASE_URL}/events/{event_id}", headers=headers())
    event = r.json()
    old_level = event["level"]
    old_missions_count = len(event.get("missions", []))
    print(f"  更新前等级: {old_level}")
    print(f"  更新前任务数: {old_missions_count}")

    new_level = "A级" if old_level in ["B级", "C级", "D级"] else "S级"
    print(f"  将升级到: {new_level}")

    update_data = {
        "title": event["title"],
        "type": event["type"],
        "level": new_level,
        "date": event["date"],
        "location": event["location"],
        "description": event["description"],
        "result": event.get("result"),
        "disposalStatus": event["disposalStatus"],
        "disposalConclusion": event.get("disposalConclusion"),
        "isPublic": event["isPublic"],
    }

    r = requests.put(f"{BASE_URL}/events/{event_id}", headers=headers(), json=update_data)
    result = r.json()

    if r.status_code != 200:
        print(f"  ❌ 更新失败: {result}")
        return False

    print(f"  更新后等级: {result['level']}")
    print(f"  更新后任务数: {len(result.get('missions', []))}")

    if "_escalation" in result:
        esc = result["_escalation"]
        print(f"\n  ⚠️  等级升级成功触发!")
        print(f"     原因: {esc['reason']}")
        print(f"     旧等级 → 新等级: {esc['oldLevel']} → {esc['newLevel']}")
        print(f"     生成任务ID: {esc['missionId']}")
        print(f"     生成任务标题: {esc['missionTitle']}")

        mission_r = requests.get(f"{BASE_URL}/missions/{esc['missionId']}", headers=headers())
        if mission_r.status_code == 200:
            mission = mission_r.json()
            print(f"\n  📋 生成的任务详情:")
            print(f"     标题: {mission['title']}")
            print(f"     优先级: {mission['priority']}")
            print(f"     状态: {mission['status']}")
            print(f"     截止日期: {mission['dueDate']}")
            print(f"     关联事件ID: {mission.get('eventId')}")

        print(f"\n  ✅ 等级升级测试通过!")
        return True
    else:
        print(f"  ❌ 未触发等级升级")
        return False

def test_result_worsen(event_id):
    print(f"\n{'='*60}")
    print(f"测试 2: 事件结果恶化 (事件 ID: {event_id})")
    print(f"{'='*60}")

    r = requests.get(f"{BASE_URL}/events/{event_id}", headers=headers())
    event = r.json()
    old_result = event.get("result") or "无"
    print(f"  当前结果: {old_result}")

    new_result = "失败"
    if old_result == "失败":
        print(f"  当前结果已经是失败，换用降级测试不适用")
        print(f"  ⚠️  跳过结果恶化测试（结果已是失败）")
        return None

    print(f"  将结果改为: {new_result}")

    update_data = {
        "title": event["title"],
        "type": event["type"],
        "level": event["level"],
        "date": event["date"],
        "location": event["location"],
        "description": event["description"],
        "result": new_result,
        "disposalStatus": "处置中",
        "disposalConclusion": event.get("disposalConclusion"),
        "isPublic": event["isPublic"],
    }

    r = requests.put(f"{BASE_URL}/events/{event_id}", headers=headers(), json=update_data)

    if r.status_code != 200:
        print(f"  ❌ 更新失败: {r.json()}")
        return False

    result = r.json()
    print(f"  更新后结果: {result.get('result', '无')}")

    if "_escalation" in result:
        esc = result["_escalation"]
        print(f"\n  ⚠️  结果恶化成功触发升级!")
        print(f"     原因: {esc['reason']}")
        print(f"     生成任务ID: {esc['missionId']}")
        print(f"     生成任务标题: {esc['missionTitle']}")
        print(f"\n  ✅ 结果恶化测试通过!")
        return True
    else:
        escalations = result.get("levelEscalations", [])
        if len(escalations) > 0:
            print(f"  ℹ️  已有升级记录: {len(escalations)} 条")
            latest = escalations[0]
            print(f"     最新: {latest['reason']}")
        print(f"  ⚠️  本次更新未触发新的升级（可能之前已升级过）")
        return None

def test_risk_stats():
    print(f"\n{'='*60}")
    print(f"测试 3: 风险统计数据")
    print(f"{'='*60}")

    r = requests.get(f"{BASE_URL}/events/risk-stats", headers=headers())
    if r.status_code != 200:
        print(f"  ❌ 获取失败: {r.json()}")
        return False

    stats = r.json()
    print(f"  总事件数: {stats['totalEvents']}")
    print(f"  待处置事件: {stats['pendingEvents']}")
    print(f"  已升级事件: {stats['escalatedEvents']}")
    print(f"  高危事件: {stats['highRiskEvents']}")
    print(f"  进行中任务: {stats['activeMissions']}")
    print(f"  高优先级任务: {stats['highPriorityMissions']}")
    print(f"  风险等级: {stats['riskLevel']}")
    print(f"  近期升级记录: {len(stats['recentEscalations'])} 条")
    print(f"  等级分布: {stats['levelDistribution']}")

    if stats['escalatedEvents'] > 0 and len(stats['recentEscalations']) > 0:
        latest = stats['recentEscalations'][0]
        print(f"\n  📊 最新升级记录:")
        print(f"     事件: {latest['event']['title']}")
        print(f"     等级变化: {latest['oldLevel']} → {latest['newLevel']}")
        print(f"     原因: {latest['reason']}")
        if latest.get('triggeredMission'):
            print(f"     触发任务: {latest['triggeredMission']['title']}")
            print(f"     任务状态: {latest['triggeredMission']['status']}")

    print(f"\n  ✅ 风险统计测试通过!")
    return True

def test_escalation_history_on_event(event_id):
    print(f"\n{'='*60}")
    print(f"测试 4: 事件详情中的升级历史 (事件 ID: {event_id})")
    print(f"{'='*60}")

    r = requests.get(f"{BASE_URL}/events/{event_id}", headers=headers())
    event = r.json()
    escalations = event.get("levelEscalations", [])

    print(f"  升级记录数: {len(escalations)}")
    for i, esc in enumerate(escalations):
        print(f"\n  记录 {i+1}:")
        print(f"    等级: {esc['oldLevel']} → {esc['newLevel']}")
        print(f"    原因: {esc['reason']}")
        print(f"    时间: {esc['createdAt']}")
        if esc.get('triggeredMission'):
            print(f"    触发任务: {esc['triggeredMission']['title']}")

    if len(escalations) > 0:
        print(f"\n  ✅ 升级历史测试通过!")
        return True
    else:
        print(f"  ⚠️  暂无升级记录")
        return None

if __name__ == "__main__":
    print("🚀 开始事件升级机制测试\n")

    login()

    r = requests.get(f"{BASE_URL}/events", headers=headers())
    events = r.json()
    test_event_id = None

    for e in events:
        if e["level"] in ["B级", "C级", "D级"] and e["result"] == "成功":
            test_event_id = e["id"]
            break

    if not test_event_id:
        test_event_id = events[0]["id"]
        print(f"⚠️  找不到合适的低级事件，使用事件 ID: {test_event_id}")
    else:
        print(f"ℹ️  找到测试事件 ID: {test_event_id}")

    test1 = test_level_escalation(test_event_id)
    test2 = test_result_worsen(test_event_id)
    test3 = test_risk_stats()
    test4 = test_escalation_history_on_event(test_event_id)

    print(f"\n{'='*60}")
    print("📋 测试总结")
    print(f"{'='*60}")
    print(f"  测试1 (等级升级): {'✅ 通过' if test1 else '❌ 失败'}")
    print(f"  测试2 (结果恶化): {'✅ 通过' if test2 else '❌ 失败' if test2 == False else '⚠️  跳过'}")
    print(f"  测试3 (风险统计): {'✅ 通过' if test3 else '❌ 失败'}")
    print(f"  测试4 (升级历史): {'✅ 通过' if test4 else '❌ 失败' if test4 == False else '⚠️  跳过'}")
    print(f"\n🎉 测试完成!")
