document.addEventListener('DOMContentLoaded', () => {
    loadState(); // 保存された状態を復元

    const scanBtn = document.getElementById('scanBtn');
    const statusMsg = document.getElementById('status');

    // ★追加：連打防止用のフラグ（最初は false）
    let isProcessing = false;

    scanBtn.addEventListener('click', async () => {
        try {
            const ndef = new NDEFReader();
            await ndef.scan();
            statusMsg.textContent = "タグをタッチしてください...";

            ndef.onreading = event => {
                // ★追加：もし現在処理中なら、ここでストップ（無視する）
                if (isProcessing) return;

                const decoder = new TextDecoder();
                for (const record of event.message.records) {
                    const text = decoder.decode(record.data);
                    console.log("Read: " + text);

                    if (text >= 1 && text <= 9) {
                        // 読み取り成功！処理を開始
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
        
        // すでに埋まっている場合
        if (box.classList.contains('filled')) {
            // ★ここ重要：まだ処理中ではない場合のみ、解説へ飛ぶ
            // （＝ユーザーが改めてタッチした場合だけ飛ぶ）
            window.location.href = `detail.html?id=${id}`;
            return;
        }

        // --- ここから新しいタグの登録処理 ---
        
        // ★重要：フラグをONにする（「今忙しいから他の読み取りは無視して！」）
        isProcessing = true;

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

        // コンプリート判定
        const collected = JSON.parse(localStorage.getItem('nfc_collection') || '[]');
        console.log("現在の個数:", collected.length); 

        // 9個以上ならコンプリート演出
        if (collected.length >= 9) {
            const overlay = document.getElementById('complete-overlay');
            overlay.classList.remove('hidden');

            const nextBtn = document.getElementById('goto-detail-btn');
            nextBtn.onclick = () => {
                window.location.href = `detail.html?id=${id}`;
            };
            
            // コンプリート時は自動遷移しないので、少し待ったらフラグを解除してもいいが、
            // 基本的にこの画面で止まるので何もしなくてOK
            return; 
        }

        // --- 通常時の処理 ---
        // 1.5秒後に自動で飛ぶ
        setTimeout(() => {
            window.location.href = `detail.html?id=${id}`;
            // ページ遷移するのでフラグをfalseに戻す必要はない
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
                box.innerHTML = `<img src="images/img${id}.jpg" alt="Image ${id}">`;
                box.classList.add('filled');
                
                box.onclick = () => {
                    window.location.href = `detail.html?id=${id}`;
                };
            }
        });
    }
});