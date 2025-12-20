// ヒントデータ
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

// はずれタグのデータ（ID: "文章"）
const hazureData = {
    10: "残念！これはダミーのタグだ。",
    11: "空っぽの宝箱を見つけた...",
    12: "罠だ！...でも何も起きないようだ。",
    13: "ただの石ころのようだ。"
};

// 効果音
const audioScan = new Audio('sounds/scan.mp3');
const audioComplete = new Audio('sounds/complete.mp3'); 
audioScan.volume = 1.0;
audioComplete.volume = 1.0;

let processingId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadState(); 
    setupBoxes();
    setupHiddenReset();
    checkGameStatus(); // ★ゲームが終了しているかチェック

    // 初回訪問チェック
    checkFirstVisit();

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');
    
    // コンプリート確認
    const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    if (collected.length >= 9) {
        document.getElementById('final-challenge-area').classList.remove('hidden');
    }

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

                    if (text >= 1 && text <= 9) {
                        handleTagFound(text);
                    } else if (hazureData[text]) {
                        // ★データに登録がある番号は「はずれ演出」
                        showHazure(text);
                    } else {
                        // 登録してない番号
                        statusMsg.textContent = "未対応のタグ: " + text;
                    }
                }
            };
        } catch (error) {
            statusMsg.textContent = "エラー: " + error;
            // ゲーム終了してない場合のみボタン復活
            if (!localStorage.getItem('nfc_game_finished')) {
                scanBtn.disabled = false;
            }
        }
    });

    document.getElementById('open-quiz-btn').onclick = () => {
        document.getElementById('quiz-overlay').classList.remove('hidden');
    };
});

// ★リタイア機能
window.retireGame = function() {
    if(!confirm("本当にリタイアして結果を見ますか？\n（これ以上タグを集められなくなります）")) return;
    
    // 終了処理へ
    finishGame();
}

// ★ゲーム終了処理（リタイア・クイズ正解共通）
function finishGame() {
    // 1. 終了フラグを保存
    localStorage.setItem('nfc_game_finished', 'true');
    
    // 2. 終了時間を記録（まだ記録してなければ）
    if (!localStorage.getItem('nfc_end_time')) {
        localStorage.setItem('nfc_end_time', Date.now());
    }

    // 3. 画面の状態更新（ボタン無効化など）
    checkGameStatus();

    // 4. リザルト画面を表示
    showResult();
}

// ★画面の表示切り替え（ロード時・終了時）
function checkGameStatus() {
    const isFinished = localStorage.getItem('nfc_game_finished');
    const scanBtn = document.getElementById('scanBtn');
    const retireArea = document.getElementById('retire-area');
    const statusMsg = document.getElementById('status');

    if (isFinished) {
        // 終了後の状態
        scanBtn.disabled = true;
        scanBtn.textContent = "受付終了";
        scanBtn.style.backgroundColor = "#aaa"; // グレーアウト
        statusMsg.textContent = "お疲れ様でした！解説ページは引き続き閲覧可能です。";

        // リタイアボタンを「結果を見る」に変える
        if (retireArea) {
            retireArea.style.display = 'block'; // 表示する
            const retireBtn = retireArea.querySelector('button');
            if (retireBtn) {
                retireBtn.textContent = "結果を見る"; // 文言変更
                retireBtn.onclick = showResult;       // 動きを「リザルト表示」に変更
                retireBtn.style.background = "#2196f3"; // 色を青などに変えると分かりやすい
            }
        }
        
        // クイズの「回答する」ボタンを「結果を見る」に変える
        const quizBtn = document.getElementById('quiz-answer-btn');
        if(quizBtn) {
            quizBtn.textContent = "結果を見る";
            quizBtn.onclick = showResult;
            quizBtn.classList.remove('challenge-btn'); // アニメーション消す
            quizBtn.style.background = "#2196f3"; // 青色にする
        }
    }
}

// ★リザルト画面の生成と表示（デザイン強化版）
function showResult() {
    // データの取得
    const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    const startTime = parseInt(localStorage.getItem('nfc_start_time') || Date.now());
    const endTime = parseInt(localStorage.getItem('nfc_end_time') || Date.now());

    // タイム計算
    let diffSeconds = Math.floor((endTime - startTime) / 1000);
    if (diffSeconds < 0) diffSeconds = 0;
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;
    // 0埋め（例: 5秒 → 05秒）して見栄えを良くする
    const timeStr = `${minutes}分${seconds.toString().padStart(2, '0')}秒`;

    // 採点ロジック
    let rank = "C";
    let comment = "次頑張ればええで！";
    const count = collected.length;

    if (count === 9) {
        rank = "S";
        comment = "完璧や！めっちゃすごいやん！！";
        if (minutes < 10) { // 5分以内ならSS
            rank = "SS";
            comment = "速いし完璧やん！！めちゃくちゃすごいやん！！";
        }
    } else if (count >= 7) {
        rank = "A";
        comment = "すごいやん！その調子や！";
    } else if (count >= 4) {
        rank = "B";
        comment = "よー頑張ったやん！";
    }

    // ★HTMLへの反映（デザイン用の構造に変更）
    // 1. スコアとタイムを入れる箱
    const statsHtml = `
        <div class="result-stats">
            <p>獲得数 <span>${count} / 9</span></p>
            <p>タイム <span>${timeStr}</span></p>
        </div>
    `;
    
    // result-overlayの中身を取得
    const contentBox = document.querySelector('#result-overlay .overlay-content');
    
    // 中身をデザインに合わせて書き換え（innerHTMLで丸ごと更新）
    contentBox.innerHTML = `
        <h2>🏆 結果発表 🏆</h2>
        ${statsHtml}
        <div id="res-rank" class="rank-${rank.toLowerCase()}">${rank}</div>
        <p id="res-comment">${comment}</p>
        <button onclick="closeResult()">閉じる</button>
    `;

    // 表示
    document.getElementById('result-overlay').classList.remove('hidden');
    
    // 他の画面を消す
    document.getElementById('quiz-overlay').classList.add('hidden');
    document.getElementById('complete-overlay').classList.add('hidden');
}

window.closeResult = function() {
    document.getElementById('result-overlay').classList.add('hidden');
}

function handleTagFound(id) {
    const box = document.getElementById(`box-${id}`);
    processingId = id;

    box.classList.remove('flash-effect');
    void box.offsetWidth; 
    box.classList.add('flash-effect');

    if (!box.classList.contains('filled')) {
        // ★ここ重要：1つ目を初めて見つけた時にスタート時刻を記録
        const collectedBefore = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collectedBefore.length === 0) {
            localStorage.setItem('nfc_start_time', Date.now());
        }

        box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
        box.classList.add('filled');
        saveState(id);

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
        audioScan.currentTime = 0; 
        audioScan.play().catch(e => {});
    }

    setTimeout(() => {
        window.location.href = `detail.html?id=${id}`;
    }, 1000);
}

// クイズ判定処理
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
        alert("🎉 大正解！\nすべて理解できました！");
        // ★ここでゲームクリア処理（リザルトへ）
        finishGame();
    } else {
        alert("不正解があります。もう一度考えてみよう！");
    }
}

// ... setupBoxes, showHint, closeHint, closeQuiz, saveState, loadState, setupHiddenReset ...
// （これらの関数は変更なしでそのまま下に置いてください）

function setupBoxes() {
    for (let i = 1; i <= 9; i++) {
        const box = document.getElementById(`box-${i}`);
        box.onclick = () => {
            if (box.classList.contains('filled')) {
                window.location.href = `detail.html?id=${i}`;
            } else {
                showHint(i);
            }
        };
    }
}

function showHint(id) {
    const hintText = hints[id] || "ヒントはありません";
    document.getElementById('hint-text').innerText = hintText;
    document.getElementById('hint-overlay').classList.remove('hidden');
}

window.closeHint = function() {
    document.getElementById('hint-overlay').classList.add('hidden');
}

window.closeQuiz = function() {
    document.getElementById('quiz-overlay').classList.add('hidden');
}

function saveState(id) {
    let collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    if (!collected.includes(id)) {
        collected.push(id);
        localStorage.setItem('nfc_collection', JSON.stringify(collected));
    }
}

function loadState() {
    let collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    collected.forEach(id => {
        const box = document.getElementById(`box-${id}`);
        if (box) {
            box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
            box.classList.add('filled');
        }
    });
}

function setupHiddenReset() {
    let clickCount = 0;
    const title = document.querySelector('h1');
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

// 初回訪問チェック関数
function checkFirstVisit() {
    // 'nfc_visited' という記録がない場合 ＝ 初めてのアクセス
    if (!localStorage.getItem('nfc_visited')) {
        document.getElementById('intro-overlay').classList.remove('hidden');
    }
}

// ガイドを閉じる関数（HTMLのボタンから呼ばれる）
window.closeIntro = function() {
    document.getElementById('intro-overlay').classList.add('hidden');
    
    // 「もう来たことがあるよ」という記録を残す
    localStorage.setItem('nfc_visited', 'true');
}

// はずれ演出
function showHazure(id) {
    processingId = id; // 連打防止ロック

    // スマホを振動させる（対応機種のみ）
    if (navigator.vibrate) {
        navigator.vibrate(200); // ブルッと震える
    }

    // 文章をセットして表示
    const msg = hazureData[id] || "ハズレです";
    document.getElementById('hazure-text').textContent = msg;
    document.getElementById('hazure-overlay').classList.remove('hidden');
}

// はずれ画面を閉じる
window.closeHazure = function() {
    document.getElementById('hazure-overlay').classList.add('hidden');
    processingId = null; // ロック解除（またスキャンできるようにする）
}