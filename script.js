// ★ログを表示する機能（犯人特定用）
function log(msg) {
    const logDiv = document.getElementById('debug-log');
    // デバッグ用エリアを表示する
    logDiv.style.display = 'block';
    
    const p = document.createElement('div');
    p.textContent = new Date().toLocaleTimeString() + ': ' + msg;
    logDiv.prepend(p); // 新しいものを上に追加
    console.log(msg);
}

document.addEventListener('DOMContentLoaded', () => {
    log("プログラム開始 v2"); // 画面に出れば新しいコードが動いている証拠
    loadState(); 

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');
    let lastScanTime = 0;

    scanBtn.addEventListener('click', async () => {
        log("スキャンボタン押下");
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            statusMsg.textContent = "タグをタッチしてください...";
            log("スキャン待機中...");

            ndef.onreading = event => {
                const now = Date.now();
                // 時間差チェック
                if (now - lastScanTime < 2000) {
                    log("【ブロック】短時間の連打を無視しました");
                    return; 
                }
                lastScanTime = now;

                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    const text = decoder.decode(record.data);
                    log("読み取りデータ: " + text); // ★ここでタグの中身が見えます

                    if (text >= 1 && text <= 9) {
                        handleTagFound(text);
                    } else {
                        statusMsg.textContent = "未対応: " + text;
                    }
                }
            };
        } catch (error) {
            statusMsg.textContent = "エラー: " + error;
            log("エラー発生: " + error);
        }
    });

    function handleTagFound(id) {
        const box = document.getElementById(`box-${id}`);
        
        // すでに埋まっている場合
        if (box.classList.contains('filled')) {
            log(`ID:${id} は既に登録済み。移動します。`);
            window.location.href = `detail.html?id=${id}`;
            return;
        }

        log(`ID:${id} の新規登録処理を開始`);

        // 画像表示
        box.innerHTML = `<img src="images/img${id}.png" alt="Image ${id}">`;
        box.classList.add('filled');
        box.classList.add('flash-effect');

        saveState(id);

        // コンプリート判定
        const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collected.length >= 9) {
            log("コンプリート！演出を表示");
            const overlay = document.getElementById('complete-overlay');
            overlay.classList.remove('hidden');
            document.getElementById('goto-detail-btn').onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
            return; 
        }

        log("1.5秒後に移動予約しました...");
        // 1.5秒後に移動
        setTimeout(() => {
            log("時間経過。移動します！");
            window.location.href = `detail.html?id=${id}`;
        }, 1500);
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
                box.innerHTML = `<img src="images/img${id}.png" alt="Image ${id}">`;
                box.classList.add('filled');
                box.onclick = () => {
                    window.location.href = `detail.html?id=${id}`;
                };
            }
        });
    }
});