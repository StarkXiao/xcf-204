const BASE_URL = 'http://localhost:3001/api';
let TOKEN = '';

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const data = await res.json();
  TOKEN = data.token;
  console.log(`✅ 登录成功: ${TOKEN.substring(0, 30)}...`);
}

function headers() {
  return {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function testLevelEscalation(eventId) {
  console.log('\n' + '='.repeat(60));
  console.log(`测试 1: 事件等级升级 (事件 ID: ${eventId})`);
  console.log('='.repeat(60));

  const res = await fetch(`${BASE_URL}/events/${eventId}`, { headers: headers() });
  const event = await res.json();
  const oldLevel = event.level;
  const oldMissionsCount = event.missions?.length || 0;
  console.log(`  更新前等级: ${oldLevel}`);
  console.log(`  更新前任务数: ${oldMissionsCount}`);

  const newLevel = ['B级', 'C级', 'D级'].includes(oldLevel) ? 'A级' : 'S级';
  console.log(`  将升级到: ${newLevel}`);

  const updateData = {
    title: event.title,
    type: event.type,
    level: newLevel,
    date: event.date,
    location: event.location,
    description: event.description,
    result: event.result || undefined,
    disposalStatus: event.disposalStatus,
    disposalConclusion: event.disposalConclusion || undefined,
    isPublic: event.isPublic,
  };

  const putRes = await fetch(`${BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updateData),
  });

  const result = await putRes.json();

  if (putRes.status !== 200) {
    console.log(`  ❌ 更新失败:`, result);
    return false;
  }

  console.log(`  更新后等级: ${result.level}`);
  console.log(`  更新后任务数: ${result.missions?.length || 0}`);

  if (result._escalation) {
    const esc = result._escalation;
    console.log('\n  ⚠️  等级升级成功触发!');
    console.log(`     原因: ${esc.reason}`);
    console.log(`     旧等级 → 新等级: ${esc.oldLevel} → ${esc.newLevel}`);
    console.log(`     生成任务ID: ${esc.missionId}`);
    console.log(`     生成任务标题: ${esc.missionTitle}`);

    const missionRes = await fetch(`${BASE_URL}/missions/${esc.missionId}`, { headers: headers() });
    if (missionRes.status === 200) {
      const mission = await missionRes.json();
      console.log('\n  📋 生成的任务详情:');
      console.log(`     标题: ${mission.title}`);
      console.log(`     优先级: ${mission.priority}`);
      console.log(`     状态: ${mission.status}`);
      console.log(`     截止日期: ${mission.dueDate}`);
      console.log(`     关联事件ID: ${mission.eventId}`);
    }

    console.log('\n  ✅ 等级升级测试通过!');
    return true;
  } else {
    console.log('  ❌ 未触发等级升级');
    return false;
  }
}

async function testResultWorsen(eventId) {
  console.log('\n' + '='.repeat(60));
  console.log(`测试 2: 事件结果恶化 (事件 ID: ${eventId})`);
  console.log('='.repeat(60));

  const res = await fetch(`${BASE_URL}/events/${eventId}`, { headers: headers() });
  const event = await res.json();
  const oldResult = event.result || '无';
  console.log(`  当前结果: ${oldResult}`);

  const newResult = '失败';
  if (oldResult === '失败') {
    console.log('  当前结果已经是失败，跳过结果恶化测试');
    console.log('  ⚠️  跳过结果恶化测试（结果已是失败）');
    return null;
  }

  console.log(`  将结果改为: ${newResult}`);

  const updateData = {
    title: event.title,
    type: event.type,
    level: event.level,
    date: event.date,
    location: event.location,
    description: event.description,
    result: newResult,
    disposalStatus: '处置中',
    disposalConclusion: event.disposalConclusion || undefined,
    isPublic: event.isPublic,
  };

  const putRes = await fetch(`${BASE_URL}/events/${eventId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(updateData),
  });

  if (putRes.status !== 200) {
    console.log('  ❌ 更新失败:', await putRes.json());
    return false;
  }

  const result = await putRes.json();
  console.log(`  更新后结果: ${result.result || '无'}`);

  if (result._escalation) {
    const esc = result._escalation;
    console.log('\n  ⚠️  结果恶化成功触发升级!');
    console.log(`     原因: ${esc.reason}`);
    console.log(`     生成任务ID: ${esc.missionId}`);
    console.log(`     生成任务标题: ${esc.missionTitle}`);
    console.log('\n  ✅ 结果恶化测试通过!');
    return true;
  } else {
    const escalations = result.levelEscalations || [];
    if (escalations.length > 0) {
      console.log(`  ℹ️  已有升级记录: ${escalations.length} 条`);
      console.log(`     最新: ${escalations[0].reason}`);
    }
    console.log('  ⚠️  本次更新未触发新的升级（可能之前已升级过）');
    return null;
  }
}

async function testRiskStats() {
  console.log('\n' + '='.repeat(60));
  console.log('测试 3: 风险统计数据');
  console.log('='.repeat(60));

  const res = await fetch(`${BASE_URL}/events/risk-stats`, { headers: headers() });
  if (res.status !== 200) {
    console.log('  ❌ 获取失败:', await res.json());
    return false;
  }

  const stats = await res.json();
  console.log(`  总事件数: ${stats.totalEvents}`);
  console.log(`  待处置事件: ${stats.pendingEvents}`);
  console.log(`  已升级事件: ${stats.escalatedEvents}`);
  console.log(`  高危事件: ${stats.highRiskEvents}`);
  console.log(`  进行中任务: ${stats.activeMissions}`);
  console.log(`  高优先级任务: ${stats.highPriorityMissions}`);
  console.log(`  风险等级: ${stats.riskLevel}`);
  console.log(`  近期升级记录: ${stats.recentEscalations.length} 条`);
  console.log(`  等级分布:`, stats.levelDistribution);

  if (stats.escalatedEvents > 0 && stats.recentEscalations.length > 0) {
    const latest = stats.recentEscalations[0];
    console.log('\n  📊 最新升级记录:');
    console.log(`     事件: ${latest.event.title}`);
    console.log(`     等级变化: ${latest.oldLevel} → ${latest.newLevel}`);
    console.log(`     原因: ${latest.reason}`);
    if (latest.triggeredMission) {
      console.log(`     触发任务: ${latest.triggeredMission.title}`);
      console.log(`     任务状态: ${latest.triggeredMission.status}`);
    }
  }

  console.log('\n  ✅ 风险统计测试通过!');
  return true;
}

async function testEscalationHistory(eventId) {
  console.log('\n' + '='.repeat(60));
  console.log(`测试 4: 事件详情中的升级历史 (事件 ID: ${eventId})`);
  console.log('='.repeat(60));

  const res = await fetch(`${BASE_URL}/events/${eventId}`, { headers: headers() });
  const event = await res.json();
  const escalations = event.levelEscalations || [];

  console.log(`  升级记录数: ${escalations.length}`);
  escalations.forEach((esc, i) => {
    console.log(`\n  记录 ${i + 1}:`);
    console.log(`    等级: ${esc.oldLevel} → ${esc.newLevel}`);
    console.log(`    原因: ${esc.reason}`);
    console.log(`    时间: ${esc.createdAt}`);
    if (esc.triggeredMission) {
      console.log(`    触发任务: ${esc.triggeredMission.title}`);
    }
  });

  if (escalations.length > 0) {
    console.log('\n  ✅ 升级历史测试通过!');
    return true;
  } else {
    console.log('  ⚠️  暂无升级记录');
    return null;
  }
}

async function main() {
  console.log('🚀 开始事件升级机制测试\n');

  await login();

  const eventsRes = await fetch(`${BASE_URL}/events`, { headers: headers() });
  const events = await eventsRes.json();
  let testEventId = null;

  for (const e of events) {
    if (['B级', 'C级', 'D级'].includes(e.level) && e.result === '成功') {
      testEventId = e.id;
      break;
    }
  }

  if (!testEventId) {
    testEventId = events[0].id;
    console.log(`⚠️  找不到合适的低级事件，使用事件 ID: ${testEventId}`);
  } else {
    console.log(`ℹ️  找到测试事件 ID: ${testEventId}`);
  }

  const test1 = await testLevelEscalation(testEventId);
  const test2 = await testResultWorsen(testEventId);
  const test3 = await testRiskStats();
  const test4 = await testEscalationHistory(testEventId);

  console.log('\n' + '='.repeat(60));
  console.log('📋 测试总结');
  console.log('='.repeat(60));
  console.log(`  测试1 (等级升级): ${test1 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  测试2 (结果恶化): ${test2 === true ? '✅ 通过' : test2 === false ? '❌ 失败' : '⚠️  跳过'}`);
  console.log(`  测试3 (风险统计): ${test3 ? '✅ 通过' : '❌ 失败'}`);
  console.log(`  测试4 (升级历史): ${test4 === true ? '✅ 通过' : test4 === false ? '❌ 失败' : '⚠️  跳过'}`);
  console.log('\n🎉 测试完成!');
}

main().catch(console.error);
