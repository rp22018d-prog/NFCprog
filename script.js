document.addEventListener('DOMContentLoaded', () => {
    loadState(); // 保存された状態を復元

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');

    // ★最強の連打防止：最後にスキャンした時間を記録する変数
    let lastScanTime = 0;

    scanBtn.addEventListener('click', async () => {
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            statusMsg.textContent = "タグをタッチしてください...";

            ndef.onreading = event => {
                // ★ここが修正ポイント
                // 「現在時刻」と「最後にスキャンした時刻」の差が2000ミリ秒（2秒）未満なら
                // 無条件で無視して終了する（門前払い）
                const now = Date.now();
                if (now - lastScanTime < 2000) {
                    return; 
                }

                // 2秒以上経っていれば、時刻を更新して処理を進める
                lastScanTime = now;

                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    const text = decoder.decode(record.data);
                    console.log("Read: " + text);

                    if (text >= 1 && text <= 9) {
                        handleTagFound(text);
                    } else {
                        statusMsg.textContent = "未対応のタグです: " + text;
                    }
                }
            };
        } catch (error) {
            statusMsg.textContent = "エラー: " + error;
            console.log(error);
        }
    });

    // タグが見つかったときの処理
    function handleTagFound(id) {
        const box = document.getElementById(`box-${id}`);
        
        // すでに埋まっている場合（過去に登録済み）
        if (box.classList.contains('filled')) {
            // すでに持っているなら即移動でOK
            window.location.href = `detail.html?id=${id}`;
            return;
        }

        // --- ここから新しいタグの登録処理 ---
        
        // 1. 画像を表示
        // （ここの画像パスはご自身の画像に合わせてください）
        box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
        
        box.classList.add('filled');
        box.classList.add('flash-effect');

        // 2. 状態を保存
        saveState(id);

        // 3. コンプリート判定
        const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        if (collected.length >= 9) {
            const overlay = document.getElementById('complete-overlay');
            overlay.classList.remove('hidden');

            const nextBtn = document.getElementById('goto-detail-btn');
            nextBtn.onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
            return; 
        }

        // 4. 通常時の処理（1.5秒後に自動で飛ぶ）
        setTimeout(() => {
            window.location.href = `detail.html?id=${id}`;
        }, 1500);
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
                // 復元時はクリックイベントをつける（後で見返すとき用）
                box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
                box.classList.add('filled');
                
                box.onclick = () => {
                    window.location.href = `detail.html?id=${id}`;
                };
            }
        });
    }
});