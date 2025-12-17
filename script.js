// ログ表示機能
function log(msg) {
    const logDiv = document.getElementById('debug-log');
    if(logDiv) {
        logDiv.style.display = 'block';
        const p = document.createElement('div');
        p.textContent = new Date().toLocaleTimeString().split(' ')[0] + ': ' + msg;
        logDiv.prepend(p);
    }
    console.log(msg);
}

document.addEventListener('DOMContentLoaded', () => {
    log("プログラム起動 (1回だけ表示されるはず)");
    loadState(); 

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');
    
    // ★現在処理中のIDを記録しておく変数
    let processingId = null;

    scanBtn.addEventListener('click', async () => {
        // ★ボタンを一度押したら無効化して、リーダーを多重起動させない
        scanBtn.disabled = true;
        scanBtn.textContent = "スキャン待機中...";

        log("スキャン開始");
        
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            statusMsg.textContent = "タグをタッチしてください...";

            ndef.onreading = event => {
                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    const text = decoder.decode(record.data);
                    
                    // ★「今まさに処理しているID」と同じなら、完全に無視！
                    if (processingId === text) {
                        log(`ID:${text} は処理中なので無視`);
                        return;
                    }

                    if (text >= 1 && text <= 9) {
                        handleTagFound(text);
                    } else {
                        statusMsg.textContent = "未対応: " + text;
                    }
                }
            };
        } catch (error) {
            statusMsg.textContent = "エラー: " + error;
            log("エラー: " + error);
            // エラー時だけボタンを復活させる
            scanBtn.disabled = false;
        }
    });

    function handleTagFound(id) {
        const box = document.getElementById(`box-${id}`);
        
        // 既に持っているタグをスキャンした場合
        if (box.classList.contains('filled')) {
            log(`ID:${id} (所持済) -> 移動`);
            window.location.href = `detail.html?id=${id}`;
            return;
        }

        // --- 新規取得の処理 ---

        // ★ロックをかける（これでもう同じIDは受け付けない）
        processingId = id;
        log(`ID:${id} 新規獲得！演出開始`);

        // 画像表示
        box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
        box.classList.add('filled');
        box.classList.add('flash-effect');

        saveState(id);

        // コンプリート判定
        const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collected.length >= 9) {
            log("コンプリート演出！");
            const overlay = document.getElementById('complete-overlay');
            overlay.classList.remove('hidden');
            document.getElementById('goto-detail-btn').onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
            return; 
        }

        // 通常移動
        log("1.5秒待機中...");
        setTimeout(() => {
            log("移動実行");
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
                box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
                box.classList.add('filled');
                box.onclick = () => {
                    window.location.href = `detail.html?id=${id}`;
                };
            }
        });
    }
});