// --- データ定義 ---
const hints = {
    1: "1番のヒント：入り口の近く。",
    2: "2番のヒント：赤い屋根の下。",
    3: "3番のヒント：大きな木の後ろ。",
    4: "4番のヒント：受付のあたり。",
    5: "5番のヒント：自販機の横。",
    6: "6番のヒント：2階へ上がってすぐ。",
    7: "7番のヒント：ベンチの裏側。",
    // 8: "8番のヒント：ポスターのところ。",
    // 9: "9番のヒント：一番奥の部屋。",
};

const hazureData = {
    10: "残念！これはダミーのタグだ。",
    11: "空っぽの宝箱を見つけた...",
    12: "罠だ！...でも何も起きないようだ。",
    13: "ただの石ころのようだ。"
};

// --- 音声設定 ---
const audioScan = new Audio('sounds/scan.mp3');
const audioComplete = new Audio('sounds/complete.mp3'); 
audioScan.volume = 1.0;
audioComplete.volume = 1.0;

let processingId = null;

// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    // 重要な関数を順に実行
    loadState();        // 1. 保存データの復元
    setupIndicators();  // 2. ボタンのクリック設定
    setupHiddenReset(); // 3. リセット機能設定
    checkGameStatus();  // 4. ゲーム終了状態の確認
    checkFirstVisit();  // 5. 初回訪問ガイド
    
    // コンプリート状態ならボタン表示
    const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    if (collected.length >= 7) {
        document.getElementById('final-challenge-area').classList.remove('hidden');
    }

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');
    
    // クイズボタンの設定
    document.getElementById('open-quiz-btn').onclick = () => {
        document.getElementById('quiz-overlay').classList.remove('hidden');
    };

    // スキャンボタンのイベント
    scanBtn.addEventListener('click', async () => {
        // 音出し準備
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

                    if (text >= 1 && text <= 7) {
                        handleTagFound(text);
                    } else if (text >= 8) {
                        handleHazureRedirect(text);
                    } else {
                        statusMsg.textContent = "未対応: " + text;
                    }
                }
            };
        } catch (error) {
            statusMsg.textContent = "エラー: " + error;
            // ゲームが終わってなければボタン復活
            if (!localStorage.getItem('nfc_game_finished')) {
                scanBtn.disabled = false;
            }
        }
    });
});

// --- メインロジック: タグ発見時 ---
function handleTagFound(id) {
    const indicator = document.getElementById(`box-${id}`);
    processingId = id;

    // まだ持っていない場合
    if (!indicator.classList.contains('filled')) {
        // スタート時刻記録
        const collectedBefore = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collectedBefore.length === 0) {
            localStorage.setItem('nfc_start_time', Date.now());
        }

        // ★スタンプ画像を追加
        addStampImage(id);
        
        // インジケーターを「済み」にする
        indicator.classList.add('filled');
        
        // 保存
        saveState(id);

        // コンプリート判定
        const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collected.length >= 7) {
            // ファンファーレ再生
            audioComplete.currentTime = 0; 
            audioComplete.play().catch(e => {});

            // お祝い画面表示
            const overlay = document.getElementById('complete-overlay');
            overlay.classList.remove('hidden');
            document.getElementById('final-challenge-area').classList.remove('hidden');
            
            document.getElementById('complete-detail-btn').onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
            return; 
        }
        
        // 通常スキャン音
        audioScan.currentTime = 0; 
        audioScan.play().catch(e => {});
    } else {
        // 既読演出
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

// --- スタンプ画像追加 ---
function addStampImage(id) {
    const stage = document.getElementById('stamp-stage');
    // 既に同じIDの画像がないかチェック（重複防止）
    if (document.getElementById(`stamp-img-${id}`)) return;

    const img = document.createElement('img');
    img.src = `images/img${id}.jpg`;
    img.className = 'stamp-layer';
    img.id = `stamp-img-${id}`; // IDをつけて管理
    img.style.zIndex = id; // 番号順に重ねる
    stage.appendChild(img);
}

// --- インジケーター設定 ---
function setupIndicators() {
    for (let i = 1; i <= 7; i++) {
        const btn = document.getElementById(`box-${i}`);
        if(!btn) continue;
        btn.onclick = () => {
            if (btn.classList.contains('filled')) {
                window.location.href = `detail.html?id=${i}`;
            } else {
                showHint(i);
            }
        };
    }
}

// --- 保存と復元 ---
function saveState(id) {
    let collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    if (!collected.includes(id)) {
        collected.push(id);
        localStorage.setItem('nfc_collection', JSON.stringify(collected));
    }
}

function loadState() {
    let collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    // 番号順にソートして描画
    collected.sort((a, b) => parseInt(a) - parseInt(b));

    collected.forEach(id => {
        addStampImage(id);
        const indicator = document.getElementById(`box-${id}`);
        if (indicator) {
            indicator.classList.add('filled');
        }
    });
}

// --- はずれ演出 ---
function handleHazureRedirect(id){
    processingId = id;

    // 1. ハズレ演出（音と振動）
    audioScan.currentTime = 0;
    audioScan.play().catch(e => {});
    if (navigator.vibrate) navigator.vibrate(500); // 長めにブブーッ！

    // 2. スタンプは押さない！
    // 3. すぐに解説ページへ移動
    window.location.href = `detail.html?id=${id}`;
}
// function showHazure(id) {
//     processingId = id;
//     audioScan.currentTime = 0;
//     audioScan.play().catch(e => {});
//     if (navigator.vibrate) navigator.vibrate(200);

//     const msg = hazureData[id] || "ハズレです";
//     document.getElementById('hazure-text').textContent = msg;
//     document.getElementById('hazure-overlay').classList.remove('hidden');
// }

// window.closeHazure = function() {
//     document.getElementById('hazure-overlay').classList.add('hidden');
//     processingId = null;
// }

// --- ヒント表示 ---
function showHint(id) {
    const hintText = hints[id] || "ヒントはありません";
    document.getElementById('hint-text').innerText = hintText;
    document.getElementById('hint-overlay').classList.remove('hidden');
}

window.closeHint = function() {
    document.getElementById('hint-overlay').classList.add('hidden');
}

// --- ゲーム終了・リザルト関連 ---
window.retireGame = function() {
    if(!confirm("本当にリタイアして結果を見ますか？\n（これ以上タグを集められなくなります）")) return;
    finishGame();
}

function finishGame() {
    localStorage.setItem('nfc_game_finished', 'true');
    if (!localStorage.getItem('nfc_end_time')) {
        localStorage.setItem('nfc_end_time', Date.now());
    }
    checkGameStatus();
    showResult();
}

function checkGameStatus() {
    const isFinished = localStorage.getItem('nfc_game_finished');
    const scanBtn = document.getElementById('scanBtn');
    const retireArea = document.getElementById('retire-area');
    const statusMsg = document.getElementById('status');

    if (isFinished) {
        scanBtn.disabled = true;
        scanBtn.textContent = "受付終了";
        scanBtn.style.backgroundColor = "#aaa";
        statusMsg.textContent = "お疲れ様でした！解説ページは引き続き閲覧可能です。";

        if (retireArea) {
            retireArea.style.display = 'block';
            const retireBtn = retireArea.querySelector('button');
            if (retireBtn) {
                retireBtn.textContent = "結果を見る";
                retireBtn.onclick = showResult;
                retireBtn.style.background = "#2196f3";
            }
        }
        
        const quizBtn = document.getElementById('quiz-answer-btn');
        if(quizBtn) {
            quizBtn.textContent = "結果を見る";
            quizBtn.onclick = showResult;
            quizBtn.classList.remove('challenge-btn');
            quizBtn.style.background = "#2196f3";
        }
    }
}

function showResult() {
    const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    const startTime = parseInt(localStorage.getItem('nfc_start_time') || Date.now());
    const endTime = parseInt(localStorage.getItem('nfc_end_time') || Date.now());

    let diffSeconds = Math.floor((endTime - startTime) / 1000);
    if (diffSeconds < 0) diffSeconds = 0;
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    const timeStr = `${minutes}分${seconds.toString().padStart(2, '0')}秒`;

    let rank = "C";
    let comment = "次はもっと集めよう！";
    const count = collected.length;

    if (count === 7) {
        rank = "S";
        comment = "完璧です！伝説の探検家！";
        if (minutes < 10) { 
            rank = "SS";
            comment = "神速の探検家！！凄すぎる！";
        }
    } else if (count >= 5) {
        rank = "A";
        comment = "素晴らしい成果です！";
    } else if (count >= 2) {
        rank = "B";
        comment = "なかなかやりますね！";
    }

    const contentBox = document.getElementById('result-content-area');
    contentBox.innerHTML = `
        <div class="result-stats">
            <p>獲得数 <span>${count} / 7</span></p>
            <p>タイム <span>${timeStr}</span></p>
        </div>
        <div id="res-rank" class="rank-${rank.toLowerCase()}">${rank}</div>
        <p id="res-comment">${comment}</p>
        <button onclick="closeResult()">閉じる</button>
    `;

    document.getElementById('result-overlay').classList.remove('hidden');
    document.getElementById('quiz-overlay').classList.add('hidden');
    document.getElementById('complete-overlay').classList.add('hidden');
}

window.closeResult = function() {
    document.getElementById('result-overlay').classList.add('hidden');
}

// --- クイズ関連 ---
window.checkQuiz = function() {
    const answers = { q1: "correct", q2: "correct", q3: "correct", q4: "correct" };
    let isAllCorrect = true;

    for (let key in answers) {
        const select = document.getElementById(key);
        if (select.value === answers[key]) {
            select.classList.add('correct-answer');
            select.classList.remove('wrong-answer');
        } else {
            select.classList.add('wrong-answer');
            select.classList.remove('correct-answer');
            isAllCorrect = false;
        }
    }

    if (isAllCorrect) {
        alert("🎉 大正解！\nすべての謎が解けました！");
        finishGame();
    } else {
        alert("不正解があります。もう一度考えてみよう！");
    }
}

window.closeQuiz = function() {
    document.getElementById('quiz-overlay').classList.add('hidden');
}

// --- ユーティリティ ---
function setupHiddenReset() {
    let clickCount = 0;
    const title = document.querySelector('h1');
    if(!title) return;
    title.onclick = () => {
        clickCount++;
        if (clickCount >= 5) {
            if(confirm("データをリセットしますか？")) {
                localStorage.clear();
                location.reload();
            }
            clickCount = 0;
        }
        setTimeout(() => clickCount = 0, 1000);
    };
}

function checkFirstVisit() {
    if (!localStorage.getItem('nfc_visited')) {
        document.getElementById('intro-overlay').classList.remove('hidden');
    }
}

window.closeIntro = function() {
    document.getElementById('intro-overlay').classList.add('hidden');
    localStorage.setItem('nfc_visited', 'true');
    audioScan.play().then(() => audioScan.pause()).catch(e => {});
}