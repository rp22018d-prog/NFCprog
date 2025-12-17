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

// 効果音の準備
const audioScan = new Audio('sounds/scan.mp3');
const audioComplete = new Audio('sounds/complete.mp3'); // コンプリート音がない場合は scan.mp3 にしてもOK

// スマホで音を鳴らすための「おまじない」（音量設定など）
audioScan.volume = 1.0;
audioComplete.volume = 1.0;



let processingId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadState(); 
    setupBoxes();
    setupHiddenReset(); // ★裏コマンドの設定

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');
    
    // コンプリート済みなら「最後の試練」ボタンを表示
    checkCompleteInitial();

    scanBtn.addEventListener('click', async () => {
        // 無音で一瞬再生して、ブラウザに「音出していいよ」と認識させる
        audioScan.play().then(() => audioScan.pause()).catch(e => console.log(e));
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
                    }
                }
            };
        } catch (error) {
            statusMsg.textContent = "エラー: " + error;
            scanBtn.disabled = false;
        }
    });

    // クイズボタンのイベント
    document.getElementById('open-quiz-btn').onclick = () => {
        document.getElementById('quiz-overlay').classList.remove('hidden');
    };
});

// ★裏コマンド：タイトルを5回連打でリセット
function setupHiddenReset() {
    let clickCount = 0;
    const title = document.querySelector('h1'); // タイトル要素を取得
    
    title.onclick = () => {
        clickCount++;
        // 5回クリックされたら
        if (clickCount >= 5) {
            if(confirm("データをリセットしますか？")) {
                localStorage.clear();
                location.reload();
            }
            clickCount = 0;
        }
        // 1秒間操作がなかったらカウントを0に戻す
        setTimeout(() => {
            clickCount = 0;
        }, 1000);
    };
}

function handleTagFound(id) {
    const box = document.getElementById(`box-${id}`);
    processingId = id;

    // 演出リセット
    box.classList.remove('flash-effect');
    void box.offsetWidth; 
    box.classList.add('flash-effect');

    // まだ持っていない場合
    if (!box.classList.contains('filled')) {
        box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
        box.classList.add('filled');
        saveState(id);

        const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        
        // ★コンプリート時の処理
        if (collected.length >= 9) {
            // ★コンプリート音を再生！
            audioComplete.currentTime = 0; // 最初から
            audioComplete.play().catch(e => console.log("再生エラー", e));

            // お祝い画面を表示
            const overlay = document.getElementById('complete-overlay');
            overlay.classList.remove('hidden');
            document.getElementById('final-challenge-area').classList.remove('hidden');
            
            // ボタン設定
            document.getElementById('complete-detail-btn').onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
            
            return; 
        }

        // ★通常スキャン時の処理
        // ここで「ピコン！」と鳴らす
        audioScan.currentTime = 0; // 最初から再生
        audioScan.play().catch(e => console.log("再生エラー", e));
    } else {
        // (既に持っている場合も音を鳴らしたいなら、ここに audioScan.play() を追加)
        audioScan.currentTime = 0; 
        audioScan.play().catch(e => {});
    }

    // 通常移動
    setTimeout(() => {
        window.location.href = `detail.html?id=${id}`;
    }, 1000);
}

// 初期読み込み時にコンプリートしているか確認
function checkCompleteInitial() {
    const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    if (collected.length >= 9) {
        document.getElementById('final-challenge-area').classList.remove('hidden');
    }
}

// ★クイズの判定処理
window.checkQuiz = function() {
    // 正解のvalueを設定（HTMLのoption valueと合わせる）
    const answers = {
        q1: "correct",
        q2: "correct",
        q3: "correct",
        q4: "correct"
    };

    let isAllCorrect = true;

    // 各問題をチェック
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
        alert("🎉 大正解！\n真のエンディングへ到達しました！");
        document.getElementById('quiz-overlay').classList.add('hidden');
    } else {
        alert("不正解があります。もう一度考えてみよう！");
    }
}

window.closeQuiz = function() {
    document.getElementById('quiz-overlay').classList.add('hidden');
}

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