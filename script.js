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
    
    // 既に持っているタグなら解説へ
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

    // ★ここを変更：コンプリート判定を行う
    const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
    
    if (collected.length === 9) {
        // --- 9個そろった時の特別演出 ---
        
        // 1. お祝い画面を表示
        const overlay = document.getElementById('complete-overlay');
        overlay.classList.remove('hidden');

        // 2. ボタンを押したら最後の解説へ飛ぶように設定
        const nextBtn = document.getElementById('goto-detail-btn');
        nextBtn.onclick = () => {
            window.location.href = `detail.html?id=${id}`;
        };

        // ※ここで終了（return）することで、下のsetTimeout（自動移動）を実行させない！
        return; 
    }

    // --- 通常時の処理 ---
    // 1.5秒後に自動で飛ぶ
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