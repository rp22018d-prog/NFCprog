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
    
    // もし既に持っているタグをスキャンしたら、すぐ解説へ
    if (box.classList.contains('filled')) {
        window.location.href = `detail.html?id=${id}`;
        return;
    }

    // 1. 画像を表示して「埋まった」状態にする
    box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
    box.classList.add('filled');
    
    // 2. 演出（アニメーション）クラスを追加
    box.classList.add('flash-effect');

    // 3. 状態を保存する
    saveState(id);

    // 【ポイント1】 クリックしても飛べるように設定しておく（後で戻ってきたとき用）
    box.onclick = () => {
        window.location.href = `detail.html?id=${id}`;
    };

    // 【ポイント2】 1.5秒後に自動で飛ぶ設定もする（スキャン時用）
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