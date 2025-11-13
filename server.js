const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;

// ミドルウェア
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// データファイルのパス
const DATA_FILE = path.join(__dirname, 'database', 'contracts.json');
const HISTORY_FILE = path.join(__dirname, 'database', 'history.json');

// データベースディレクトリの作成
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 履歴データの初期化
if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify({ history: [] }, null, 2));
}

// 初期データの作成
if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
        contracts: [
            {
                id: "AC-2025-0001",
                companyName: "株式会社テクノサポート",
                contactPerson: "田中 太郎",
                email: "tanaka@techno-support.co.jp",
                phone: "03-1234-5678",
                address: "東京都渋谷区渋谷1-2-3 テクノビル5F",
                plan: "ビジネスプラン",
                monthlyFee: 6980,
                startDate: "2025-11-01",
                nextBillingDate: "2025-12-01",
                status: "有効",
                paymentStatus: "支払済",
                paymentMethod: "クレジットカード",
                cardNumber: "**** **** **** 1234",
                cardExpiry: "12/2027",
                bankName: "",
                accountNumber: "",
                salesPerson: "湯浅 晃平",
                registrationDate: "2025-11-01"
            },
            {
                id: "AC-2025-0002",
                companyName: "山田商事株式会社",
                contactPerson: "山田 花子",
                email: "yamada@yamada-trading.co.jp",
                phone: "03-2345-6789",
                address: "東京都新宿区新宿2-3-4 山田ビル3F",
                plan: "3ヶ月無料",
                monthlyFee: 6980,
                startDate: "2025-11-03",
                nextBillingDate: "2026-02-03",
                status: "有効",
                paymentStatus: "支払済",
                paymentMethod: "口座振替",
                cardNumber: "",
                cardExpiry: "",
                bankName: "みずほ銀行",
                accountNumber: "*******1234",
                salesPerson: "湯浅 晃平",
                registrationDate: "2025-11-03"
            },
            {
                id: "AC-2025-0003",
                companyName: "佐藤エンタープライズ",
                contactPerson: "佐藤 次郎",
                email: "sato@sato-ent.co.jp",
                phone: "03-3456-7890",
                address: "東京都港区六本木1-2-3 佐藤タワー10F",
                plan: "6ヶ月無料",
                monthlyFee: 71760,
                startDate: "2025-11-05",
                nextBillingDate: "2026-05-05",
                status: "保留中",
                paymentStatus: "未払い",
                paymentMethod: "クレジットカード",
                cardNumber: "**** **** **** 5678",
                cardExpiry: "08/2026",
                bankName: "",
                accountNumber: "",
                salesPerson: "鈴木 友梨音",
                registrationDate: "2025-11-05"
            },
            {
                id: "AC-2025-0004",
                companyName: "鈴木インダストリー",
                contactPerson: "鈴木 美咲",
                email: "suzuki@suzuki-ind.co.jp",
                phone: "03-4567-8901",
                address: "東京都品川区大崎2-3-4 鈴木ビル7F",
                plan: "ビジネスプラン",
                monthlyFee: 6980,
                startDate: "2025-11-07",
                nextBillingDate: "2025-12-07",
                status: "有効",
                paymentStatus: "支払済",
                paymentMethod: "口座振替",
                cardNumber: "",
                cardExpiry: "",
                bankName: "三菱UFJ銀行",
                accountNumber: "*******5678",
                salesPerson: "柳瀬 智文",
                registrationDate: "2025-11-07"
            },
            {
                id: "AC-2025-0005",
                companyName: "高橋コンサルティング",
                contactPerson: "高橋 健一",
                email: "takahashi@takahashi-consul.co.jp",
                phone: "03-5678-9012",
                address: "東京都千代田区丸の内1-1-1 高橋ビル15F",
                plan: "12ヶ月無料",
                monthlyFee: 71760,
                startDate: "2025-11-08",
                nextBillingDate: "2026-11-08",
                status: "有効",
                paymentStatus: "未払い",
                paymentMethod: "クレジットカード",
                cardNumber: "**** **** **** 9012",
                cardExpiry: "03/2028",
                bankName: "",
                accountNumber: "",
                salesPerson: "高山 将明",
                registrationDate: "2025-11-08"
            }
        ]
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
}

// データの読み込み
function readData() {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
}

// データの保存
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// 履歴データの読み込み
function readHistory() {
    const data = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
}

// 履歴データの保存
function saveHistory(data) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(data, null, 2));
}

// API: 契約追加
app.post('/api/contracts', (req, res) => {
    const data = readData();
    const newContract = req.body;
    
    // IDの自動生成
    const lastId = data.contracts.length > 0 
        ? parseInt(data.contracts[data.contracts.length - 1].id.split('-')[2])
        : 0;
    newContract.id = `AC-2025-${String(lastId + 1).padStart(4, '0')}`;
    
    // デフォルト値設定
    if (!newContract.paymentStatus) {
        newContract.paymentStatus = '未払い';
    }
    
    data.contracts.push(newContract);
    saveData(data);
    res.json(newContract);
});

// API: 契約更新
app.put('/api/contracts/:id', (req, res) => {
    const data = readData();
    const contractId = req.params.id;
    const updatedContract = req.body;
    
    const index = data.contracts.findIndex(c => c.id === contractId);
    if (index !== -1) {
        data.contracts[index] = updatedContract;
        saveData(data);
        res.json(updatedContract);
    } else {
        res.status(404).json({ error: '契約が見つかりません' });
    }
});

// API: 契約削除
app.delete('/api/contracts/:id', (req, res) => {
    const data = readData();
    const contractId = req.params.id;
    
    const index = data.contracts.findIndex(c => c.id === contractId);
    if (index !== -1) {
        data.contracts.splice(index, 1);
        saveData(data);
        res.json({ message: '契約を削除しました' });
    } else {
        res.status(404).json({ error: '契約が見つかりません' });
    }
});

// API: 支払い状況の一括更新（CSVインポート）
app.post('/api/contracts/import-payment-status', (req, res) => {
    try {
        const updates = req.body.updates; // [{ id, paymentStatus }, ...]
        const data = readData();
        let updated = 0;
        
        updates.forEach(update => {
            const index = data.contracts.findIndex(c => c.id === update.id);
            if (index !== -1) {
                data.contracts[index].paymentStatus = update.paymentStatus;
                updated++;
            }
        });
        
        saveData(data);
        res.json({ success: true, updated, total: updates.length });
    } catch (error) {
        res.status(500).json({ error: 'インポートに失敗しました' });
    }
});

// API: 統計情報取得
app.get('/api/stats', (req, res) => {
    const data = readData();
    const contracts = data.contracts;
    
    const stats = {
        total: contracts.length,
        byStatus: {
            active: contracts.filter(c => c.status === '有効').length,
            pending: contracts.filter(c => c.status === '保留中').length,
            suspended: contracts.filter(c => c.status === '中断').length
        },
        byPaymentStatus: {
            paid: contracts.filter(c => c.paymentStatus === '支払済').length,
            unpaid: contracts.filter(c => c.paymentStatus === '未払い').length,
            overdue: contracts.filter(c => c.paymentStatus === '延滞').length
        },
        revenue: contracts.filter(c => c.status === '有効').reduce((sum, c) => sum + c.monthlyFee, 0)
    };
    
    res.json(stats);
});

// API: 契約の対応履歴取得
app.get('/api/contracts/:id/history', (req, res) => {
    const contractId = req.params.id;
    const historyData = readHistory();
    
    const contractHistory = historyData.history.filter(h => h.contractId === contractId);
    res.json(contractHistory);
});

// API: 対応履歴追加
app.post('/api/contracts/:id/history', (req, res) => {
    const contractId = req.params.id;
    const { content } = req.body;
    const historyData = readHistory();
    
    // 日本時間で日時を取得
    const now = new Date();
    const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const createdAt = jstDate.toISOString().slice(0, 19).replace('T', ' ');
    
    const newHistory = {
        id: 'HIST-' + Date.now(),
        contractId: contractId,
        userName: 'システムユーザー', // 後で認証機能と連携
        content: content,
        createdAt: createdAt
    };
    
    historyData.history.push(newHistory);
    saveHistory(historyData);
    
    res.json({ 
        success: true, 
        history: newHistory,
        message: '対応履歴を追加しました' 
    });
});

// API: 全契約取得（未読カウント付き）
app.get('/api/contracts', (req, res) => {
    const data = readData();
    const historyData = readHistory();
    
    // 各契約の未読履歴数を計算
    const contractsWithUnread = data.contracts.map(contract => {
        const lastViewed = contract.lastHistoryViewed || '2000-01-01 00:00:00';
        const unreadCount = historyData.history.filter(h => 
            h.contractId === contract.id && h.createdAt > lastViewed
        ).length;
        
        return {
            ...contract,
            unreadHistoryCount: unreadCount
        };
    });
    
    res.json(contractsWithUnread);
});

// API: 履歴の既読マーク
app.post('/api/contracts/:id/mark-read', (req, res) => {
    const contractId = req.params.id;
    const data = readData();
    
    const index = data.contracts.findIndex(c => c.id === contractId);
    if (index !== -1) {
        const now = new Date();
        const jstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000));
        data.contracts[index].lastHistoryViewed = jstDate.toISOString().slice(0, 19).replace('T', ' ');
        saveData(data);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: '契約が見つかりません' });
    }
});

// API: 対応履歴削除
app.delete('/api/contracts/:contractId/history/:historyId', (req, res) => {
    const { historyId } = req.params;
    const historyData = readHistory();
    
    const index = historyData.history.findIndex(h => h.id === historyId);
    if (index !== -1) {
        historyData.history.splice(index, 1);
        saveHistory(historyData);
        res.json({ success: true, message: '対応履歴を削除しました' });
    } else {
        res.status(404).json({ error: '履歴が見つかりません' });
    }
});

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    // ローカルIPアドレスを取得
    Object.keys(networkInterfaces).forEach(interfaceName => {
        networkInterfaces[interfaceName].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
                localIP = iface.address;
            }
        });
    });
    
    console.log('');
    console.log('🚀 ========================================');
    console.log('🎉 AI COMP 管理システムサーバーが起動しました！');
    console.log('========================================== 🚀');
    console.log('');
    console.log('📍 アクセス方法:');
    console.log(`   ローカル: http://localhost:${PORT}`);
    console.log(`   社内LAN: http://${localIP}:${PORT}`);
    console.log('');
    console.log('💡 社内の他のPCからアクセスする場合:');
    console.log(`   👉 http://${localIP}:${PORT} を開く`);
    console.log('');
    console.log('✨ 新機能:');
    console.log('   • 支払い状況インポート機能');
    console.log('   • 契約月ソート機能');
    console.log('   • ステータス別統計表示');
    console.log('');
    console.log('⏹️  終了方法: Ctrl + C を押す');
    console.log('');
});
