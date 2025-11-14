const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// データベースディレクトリ
const DB_DIR = path.join(__dirname, 'database');
const CONTRACTS_FILE = path.join(DB_DIR, 'contracts.json');
const USERS_FILE = path.join(DB_DIR, 'users.json');

// ミドルウェア
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// データベース初期化
async function initDatabase() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    
    // contracts.json初期化
    try {
      await fs.access(CONTRACTS_FILE);
    } catch {
      await fs.writeFile(CONTRACTS_FILE, JSON.stringify([]));
      console.log('✅ contracts.json初期化完了');
    }
    
    // users.json初期化
    try {
      await fs.access(USERS_FILE);
    } catch {
      const initialUsers = [
        {
          id: 'admin',
          password: 'AiComp@2025!Admin',
          role: 'admin',
          name: '管理者',
          agencyCode: null
        },
        {
          id: 'staff',
          password: 'AiComp@2025!Staff',
          role: 'staff',
          name: 'スタッフ',
          agencyCode: null
        },
        {
          id: 'agency_a',
          password: 'AgencyA@2025!',
          role: 'agency',
          name: 'A代理店',
          agencyCode: 'AIC00001'
        },
        {
          id: 'agency_b',
          password: 'AgencyB@2025!',
          role: 'agency',
          name: 'B代理店',
          agencyCode: 'AIC00002'
        }
      ];
      await fs.writeFile(USERS_FILE, JSON.stringify(initialUsers, null, 2));
      console.log('✅ users.json初期化完了（4アカウント）');
    }
    
    console.log('✅ データベース初期化完了');
  } catch (error) {
    console.error('❌ データベース初期化エラー:', error);
  }
}

// データ読み込み
async function readContracts() {
  try {
    const data = await fs.readFile(CONTRACTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function readUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// データ書き込み
async function writeContracts(contracts) {
  await fs.writeFile(CONTRACTS_FILE, JSON.stringify(contracts, null, 2));
}

// =====================================
// 🔐 認証API
// =====================================

// ログイン
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await readUsers();
    
    const user = users.find(u => u.id === username && u.password === password);
    
    if (user) {
      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          agencyCode: user.agencyCode
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'ログイン失敗' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// =====================================
// 📋 契約管理API
// =====================================

// 契約一覧取得
app.get('/api/contracts', async (req, res) => {
  try {
    const { agencyCode, phase } = req.query;
    let contracts = await readContracts();
    
    // 取次店でフィルタ
    if (agencyCode) {
      contracts = contracts.filter(c => c.agencyCode === agencyCode);
    }
    
    // フェーズでフィルタ
    if (phase) {
      contracts = contracts.filter(c => c.phase === phase);
    }
    
    // 最新順にソート
    contracts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 契約詳細取得
app.get('/api/contracts/:id', async (req, res) => {
  try {
    const contracts = await readContracts();
    const contract = contracts.find(c => c.id === req.params.id);
    
    if (contract) {
      res.json(contract);
    } else {
      res.status(404).json({ error: '契約が見つかりません' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 契約新規登録
app.post('/api/contracts', async (req, res) => {
  try {
    const contracts = await readContracts();
    
    const newContract = {
      id: `CNT${Date.now()}`,
      ...req.body,
      phase: 'entry', // 初期フェーズ: エントリ
      status: 'エントリ待ち',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          timestamp: new Date().toISOString(),
          action: '新規登録',
          phase: 'entry',
          status: 'エントリ待ち',
          operator: req.body.operator || 'system',
          memo: '契約情報を登録しました'
        }
      ]
    };
    
    contracts.push(newContract);
    await writeContracts(contracts);
    
    res.json(newContract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 契約更新
app.put('/api/contracts/:id', async (req, res) => {
  try {
    const contracts = await readContracts();
    const index = contracts.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: '契約が見つかりません' });
    }
    
    const oldContract = contracts[index];
    const updatedContract = {
      ...oldContract,
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    contracts[index] = updatedContract;
    await writeContracts(contracts);
    
    res.json(updatedContract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// 📞 コールセンターAPI（4フェーズ管理）
// =====================================

// フェーズ・ステータス更新
app.post('/api/contracts/:id/update-status', async (req, res) => {
  try {
    const { phase, status, memo, operator, recallDateTime } = req.body;
    const contracts = await readContracts();
    const index = contracts.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: '契約が見つかりません' });
    }
    
    const contract = contracts[index];
    
    // 自動フェーズ遷移
    let newPhase = phase || contract.phase;
    
    if (status === 'エントリ完了→前確へ') {
      newPhase = 'preconfirm';
    } else if (status === '前確OK→対応へ') {
      newPhase = 'handling';
    } else if (status === '対応完了→後確へ') {
      newPhase = 'postconfirm';
    } else if (status === '後確OK→完了') {
      newPhase = 'completed';
    }
    
    // 履歴追加
    const historyEntry = {
      timestamp: new Date().toISOString(),
      action: status,
      phase: newPhase,
      status: status,
      operator: operator || 'system',
      memo: memo || ''
    };
    
    // 再コール日時がある場合
    if (recallDateTime) {
      historyEntry.recallDateTime = recallDateTime;
      historyEntry.memo += ` 📅 再コール予定: ${recallDateTime}`;
    }
    
    contract.phase = newPhase;
    contract.status = status;
    contract.updatedAt = new Date().toISOString();
    contract.history = contract.history || [];
    contract.history.push(historyEntry);
    
    // 再コール情報を保存
    if (recallDateTime) {
      contract.recallDateTime = recallDateTime;
    }
    
    contracts[index] = contract;
    await writeContracts(contracts);
    
    res.json(contract);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// フェーズ別件数取得
app.get('/api/contracts/stats/by-phase', async (req, res) => {
  try {
    const { agencyCode } = req.query;
    let contracts = await readContracts();
    
    // 取次店でフィルタ
    if (agencyCode) {
      contracts = contracts.filter(c => c.agencyCode === agencyCode);
    }
    
    const stats = {
      entry: contracts.filter(c => c.phase === 'entry').length,
      preconfirm: contracts.filter(c => c.phase === 'preconfirm').length,
      handling: contracts.filter(c => c.phase === 'handling').length,
      postconfirm: contracts.filter(c => c.phase === 'postconfirm').length,
      completed: contracts.filter(c => c.phase === 'completed').length,
      total: contracts.length
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// 🏥 ヘルスチェック
// =====================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: 'File-based storage',
    features: [
      'コールセンター4フェーズ管理',
      '取次店別データ分離',
      '再コール管理（5分刻み）',
      '自動フェーズ遷移',
      'ファイル保存方式'
    ]
  });
});

// =====================================
// 🚀 サーバー起動
// =====================================

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 AI COMP コールセンター管理システム');
    console.log('========================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Database: File-based storage`);
    console.log(`✅ Database directory: ${DB_DIR}`);
    console.log('✅ コールセンター4フェーズ管理');
    console.log('✅ 取次店別データ分離');
    console.log('✅ 再コール管理（5分刻み）');
    console.log('✅ 自動フェーズ遷移');
    console.log('========================================');
  });
});
