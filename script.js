document.addEventListener('DOMContentLoaded', () => {
    loadState(); // ページ読み込み時に保存された状態を復元

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');

    scanBtn.addEventListener('click', async () => {
        try {
            // Web NFC APIを開始
            const ndef = new NDEFReader();
            await ndef.scan();
            statusMsg.textContent = "タグをタッチしてください...";

            ndef.onreading = event => {
                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    // タグの中身（テキスト）を読み取る
                    const text = decoder.decode(record.data);
                    console.log("Read: " + text);

                    // 1〜9の数字かチェック
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
});

// タグが見つかったときの処理
function handleTagFound(id) {
    const box = document.getElementById(`box-${id}`);
    
    // 【注意】すでに埋まっているタグをタッチした場合は、すぐ解説へ飛びます
    // （コンプリート演出を見たい場合は、リセットして「まだ埋まっていないタグ」としてスキャンする必要があります）
    if (box.classList.contains('filled')) {
        window.location.href = `detail.html?id=${id}`;
        return;
    }

    // 1. 画像を表示
    box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
    box.classList.add('filled');
    box.classList.add('flash-effect');

    // 2. 状態を保存
    saveState(id);

    // 3. クリックイベント設定
    box.onclick = () => {
        window.location.href = `detail.html?id=${id}`;
    };

    // ★デバッグ：現在の個数を取得
    const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    console.log("現在の個数:", collected.length); 

    // ★修正：「=== 9」ではなく「>= 9」にする（万が一重複などで10個になっても動くように）
    if (collected.length >= 9) {
        // --- コンプリート演出 ---
        const overlay = document.getElementById('complete-overlay');
        overlay.classList.remove('hidden');

        const nextBtn = document.getElementById('goto-detail-btn');
        nextBtn.onclick = () => {
            window.location.href = `detail.html?id=${id}`;
        };

        // ここで処理を終了（下のsetTimeoutに行かせない！）
        return; 
    }

    // --- 通常時の処理 ---
    setTimeout(() => {
        window.location.href = `detail.html?id=${id}`;
    }, 1500);
}

// ページ読み込み時に状態を復元する関数
function loadState() {
    let collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    
    collected.forEach(id => {
        const box = document.getElementById(`box-${id}`);
        if (box) {
            box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
            box.classList.add('filled');
            
            // 【ポイント3】 復元したマスもクリックしたら飛べるように設定
            box.onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
        }
    });
}

// 状態を保存する関数
function saveState(id) {
    let collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    if (!collected.includes(id)) {
        collected.push(id);
        localStorage.setItem('nfc_collection', JSON.stringify(collected));
    }
}