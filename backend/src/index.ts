import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import characterRoutes from './routes/characters';
import eventRoutes from './routes/events';
import missionRoutes from './routes/missions';
import missionExtensionRoutes from './routes/missionExtensions';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: '都市异能协作站 API 服务运行正常' });
});

app.get('/api/worldview', (_req, res) => {
  res.json({
    title: '异能者管理局 - 世界观',
    setting: `
      公元2045年，全球范围内陆续出现拥有特殊能力的人类，被称为"异能者"。
      为了管理和保护这些特殊人群，同时维护社会秩序，各国联合成立了"异能者管理局"。
      
      你现在所在的是华夏区第7分局，负责管理这座城市的异能者事务。
      这里记录着每一位注册异能者的档案、每一次异能事件的处理经过，
      以及每一项待执行的任务。
      
      异能等级从低到高分为：D级、C级、B级、A级、S级、SS级。
      大部分异能者集中在B级到A级之间，S级以上属于重点保护对象。
    `,
    stats: {
      registeredCharacters: '根据数据库动态计算',
      totalEvents: '根据数据库动态计算',
      activeMissions: '根据数据库动态计算',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/mission-extensions', missionExtensionRoutes);

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});
