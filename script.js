// ★ヒントの文章データ（ここを自由に書き換えてください）
const hints = {
    1: "1番のヒント：入り口の近くを探してみて！",
    2: "2番のヒント：赤い屋根の下にあるよ。",
    3: "3番のヒント：大きな木の後ろ。",
    4: "4番のヒント：受付の人に聞いてみよう。",
    5: "5番のヒント：自販機の横。",
    6: "6番のヒント：2階へ上がってすぐ。",
    7: "7番のヒント：ベンチの裏側。",
    8: "8番のヒント：ポスターが貼ってあるところ。",
    9: "9番のヒント：一番奥の部屋。",
};

// ログなどの設定
let processingId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadState(); // 保存された状態を復元
    setupBoxes(); // ★マスのクリック設定（ヒント機能）

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');
    
    scanBtn.addEventListener('click', async () => {
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
                    
                    // 連打防止（同じIDの処理中は無視）
                    if (processingId === text) return;

                    if (text >= 1 && text <= 9) {
                        handleTagFound(text);
                    } else {
                        statusMsg.textContent = "未対応のタグ: " + text;
                    }
                }
            };
        } catch (error) {
            statusMsg.textContent = "エラー: " + error;
            console.log("Error: " + error);
            scanBtn.disabled = false;
        }
    });
});

// タグが見つかったときの処理
function handleTagFound(id) {
    const box = document.getElementById(`box-${id}`);
    processingId = id; // ロック開始

    // ★修正：2回目以降でも、演出をリセットして再再生させる
    box.classList.remove('flash-effect');
    void box.offsetWidth; // 魔法の呪文（アニメーションをリセットさせる技）
    box.classList.add('flash-effect');

    // まだ持っていない場合だけ行う処理
    if (!box.classList.contains('filled')) {
        // 画像を表示して埋める
        box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
        box.classList.add('filled');
        saveState(id); // 保存

        // コンプリート判定 (9個そろったか？)
        const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collected.length >= 9) {
            const overlay = document.getElementById('complete-overlay');
            overlay.classList.remove('hidden');
            
            document.getElementById('goto-detail-btn').onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
            return; // 自動移動はしない
        }
    }

    // ★共通処理：1.5秒後に解説へ（初回も2回目以降も共通！）
    setTimeout(() => {
        window.location.href = `detail.html?id=${id}`;
    }, 1500);
}

// ★マスのクリックイベントを設定する関数
function setupBoxes() {
    for (let i = 1; i <= 9; i++) {
        const box = document.getElementById(`box-${i}`);
        
        // 常にクリックイベントを上書き設定
        box.onclick = () => {
            // 埋まっているなら「解説ページ」へ
            if (box.classList.contains('filled')) {
                window.location.href = `detail.html?id=${i}`;
            } 
            // 埋まっていないなら「ヒント」を表示
            else {
                showHint(i);
            }
        };
    }
}

// ヒントを表示する関数
function showHint(id) {
    const hintText = hints[id] || "ヒントはありません";
    document.getElementById('hint-text').innerText = hintText;
    document.getElementById('hint-overlay').classList.remove('hidden');
}

// ヒントを閉じる関数（HTMLから呼び出す用）
window.closeHint = function() {
    document.getElementById('hint-overlay').classList.add('hidden');
}

// 状態を保存する関数
function saveState(id) {
    let collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    if (!collected.includes(id)) {
        collected.push(id);
        localStorage.setItem('nfc_collection', JSON.stringify(collected));
    }
}

// ページ読み込み時に状態を復元する関数
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