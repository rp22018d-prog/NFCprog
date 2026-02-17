// ヒント、はずれデータ、効果音設定などはそのまま...
const hints = {
    1: "1番のヒント：入り口の近く。",
    2: "2番のヒント：赤い屋根の下。",
    3: "3番のヒント：大きな木の後ろ。",
    4: "4番のヒント：受付のあたり。",
    5: "5番のヒント：自販機の横。",
    6: "6番のヒント：2階へ上がってすぐ。",
    7: "7番のヒント：ベンチの裏側。",
    8: "8番のヒント：ポスターのところ。",
    9: "9番のヒント：一番奥の部屋。",
};
const hazureData = { 10: "ダミーです", 11: "空っぽです" }; // 省略

const audioScan = new Audio('sounds/scan.mp3');
const audioComplete = new Audio('sounds/complete.mp3'); 
audioScan.volume = 1.0;
audioComplete.volume = 1.0;

let processingId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadState(); 
    setupIndicators(); // ★名前変更：setupBoxes -> setupIndicators
    setupHiddenReset();
    checkGameStatus();
    checkFirstVisit();

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');
    
    const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    if (collected.length >= 9) {
        document.getElementById('final-challenge-area').classList.remove('hidden');
    }

    scanBtn.addEventListener('click', async () => {
        // 音出し準備などはそのまま
        audioScan.play().then(() => audioScan.pause()).catch(e => {});
        audioScan.currentTime = 0;
        scanBtn.disabled = true;
        scanBtn.textContent = "スキャン待機中...";
        
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            statusMsg.textContent = "タグをタッチしてください...";

            ndef.onreading = event => {
                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    const text = decoder.decode(record.data);
                    if (processingId === text) return;

                    if (text >= 1 && text <= 9) {
                        handleTagFound(text);
                    } else if (hazureData[text]) {
                        showHazure(text);
                    } else {
                        statusMsg.textContent = "未対応: " + text;
                    }
                }
            };
        } catch (error) {
            statusMsg.textContent = "エラー: " + error;
            if (!localStorage.getItem('nfc_game_finished')) {
                scanBtn.disabled = false;
            }
        }
    });

    document.getElementById('open-quiz-btn').onclick = () => {
        document.getElementById('quiz-overlay').classList.remove('hidden');
    };
});

// ★大きく変更：タグが見つかった時の処理
function handleTagFound(id) {
    // 1. 下のインジケーターボタンを取得
    const indicator = document.getElementById(`box-${id}`);
    processingId = id;

    // まだ持っていない場合
    if (!indicator.classList.contains('filled')) {
        // スタート時刻記録
        const collectedBefore = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collectedBefore.length === 0) {
            localStorage.setItem('nfc_start_time', Date.now());
        }

        // ★変更点：スタンプ台に画像を追加する（重ねる）
        addStampImage(id);

        // インジケーターを「済み」にする
        indicator.classList.add('filled');
        
        saveState(id);

        // コンプリート判定
        const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collected.length >= 9) {
            audioComplete.currentTime = 0; 
            audioComplete.play().catch(e => {});

            const overlay = document.getElementById('complete-overlay');
            overlay.classList.remove('hidden');
            document.getElementById('final-challenge-area').classList.remove('hidden');
            
            document.getElementById('complete-detail-btn').onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
            return; 
        }
        
        audioScan.currentTime = 0; 
        audioScan.play().catch(e => {});
    } else {
        // 既に持っている場合の演出（ボタンをピカッとさせるなど）
        indicator.style.transform = "scale(1.5)";
        setTimeout(() => indicator.style.transform = "scale(1.1)", 300);
        
        audioScan.currentTime = 0; 
        audioScan.play().catch(e => {});
    }

    // 解説ページへ移動
    setTimeout(() => {
        window.location.href = `detail.html?id=${id}`;
    }, 1500);
}

// ★追加：スタンプ台に画像を重ねる関数
function addStampImage(id) {
    const stage = document.getElementById('stamp-stage');
    // imgタグを作成
    const img = document.createElement('img');
    img.src = `images/img${id}.jpg`;
    img.className = 'stamp-layer'; // CSSでアニメーションなどが設定されている
    img.style.zIndex = id; // 番号順に重なるようにする
    stage.appendChild(img);
}

// ★変更：ボタンのクリックイベント設定
function setupIndicators() {
    for (let i = 1; i <= 9; i++) {
        const btn = document.getElementById(`box-${i}`);
        btn.onclick = () => {
            // 埋まっているなら解説、埋まってないならヒント
            if (btn.classList.contains('filled')) {
                window.location.href = `detail.html?id=${i}`;
            } else {
                showHint(i);
            }
        };
    }
}

// ★変更：ロード時の復元処理
function loadState() {
    let collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    
    // 集めた順ではなく、番号順に描画したい場合はソートする
    collected.sort((a, b) => a - b);

    collected.forEach(id => {
        // 1. スタンプ画像を復元
        addStampImage(id);
        
        // 2. ボタンの状態を復元
        const indicator = document.getElementById(`box-${id}`);
        if (indicator) {
            indicator.classList.add('filled');
        }
    });
}

// ... (showHint, showHazure, finishGame, showResult, saveState など他の関数は変更なし) ...
// そのままコピーして使ってください