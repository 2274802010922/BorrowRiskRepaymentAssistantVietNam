"""Prepare local files for the owner to upload; never publishes or removes media."""
import hashlib,json,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'work'/'bilingual-demo'
OUT=ROOT/'output'
DEST=Path.home()/'Downloads'/'picachu-demo-2026-10-03'
DEST.mkdir(parents=True,exist_ok=True)
manifest=[]
for locale in ['vi','en']:
    report=json.loads((OUT/f'picachu-demo-{locale}-qa.json').read_text(encoding='utf8'))
    assert report['fullDecode']=='passed'
    for suffix in ['.mp4','.srt','-poster.jpg','-chapters.txt','-script.md','-qa.json']:
        source=OUT/f'picachu-demo-{locale}{suffix}';target=DEST/source.name
        if target.exists() and hashlib.sha256(target.read_bytes()).digest()!=hashlib.sha256(source.read_bytes()).digest():
            raise RuntimeError('Existing delivery differs: '+str(target))
        shutil.copy2(source,target)
        manifest.append({'file':target.name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
    title='picachu | Lập phương án trả nợ & phân bổ ngân sách trên Solana Devnet' if locale=='vi' else 'picachu | Goal-Based Repayment & Budget Allocation on Solana Devnet'
    body='Demo hoàn chỉnh: chọn khoản vay, đặt ngân sách và tiền giữ lại, xem phương án đủ ngân sách, tạo bản nháp mục tiêu, phân bổ khi thiếu tiền và đối chiếu biên nhận Devnet đã xác minh.' if locale=='vi' else 'Complete walkthrough: select loans, set a budget and reserve, review an affordable repayment plan, describe a goal, allocate a limited budget, and inspect a verified Devnet receipt.'
    disclosure='Cảnh lập phương án dùng dữ liệu minh họa có nhãn. Biên nhận thật thuộc vòng API test riêng ngày 03/10/2026 (giờ Việt Nam), không phải giao dịch gửi lúc ghi hình. Phần ký là sơ đồ giải thích quy trình, không quay popup Phantom. Bản nháp trong cảnh quay được đọc bằng quy tắc cố định; AI có thể hỗ trợ trích mục tiêu nhưng không tính tiền hoặc ký. Mô hình một lượt thanh lý, lưới hữu hạn; không dự báo giá, xác suất hoặc thanh lý dây chuyền. Token Devnet không có giá trị tiền thật.' if locale=='vi' else 'Planning scenes use a labeled synthetic example. The real receipt is from a separate API test on 3 October 2026 (Vietnam time), not a transaction sent during filming. Signing is explained with a labeled workflow diagram, without Phantom popup footage. The recorded goal draft uses fixed rules; AI may assist goal extraction, but cannot calculate repayment amounts or sign. One-event liquidation model and finite grid; no price, probability or cascading-liquidation prediction. Devnet tokens have no real monetary value.'
    chapters=(OUT/f'picachu-demo-{locale}-chapters.txt').read_text(encoding='utf8')
    (DEST/f'youtube-{locale}.txt').write_text(title+'\n\n'+body+'\n\nApp: https://picachu-iota.vercel.app/\nGitHub: https://github.com/2274802010922/picachu__\n\n'+chapters+'\n'+disclosure+'\n',encoding='utf8')
(DEST/'HUONG-DAN-UPLOAD.md').write_text('''# Hai video demo picachu

- Tiếng Việt: `picachu-demo-vi.mp4` — 3:37 — giọng nam, UI và phụ đề Việt.
- Tiếng Anh: `picachu-demo-en.mp4` — 4:02 — giọng nam, UI và phụ đề Anh.
- MP4 1080p/H.264/AAC, phụ đề đã gắn sẵn trên hình. SRT riêng có thể dùng làm subtitle track khi upload.
- `youtube-vi.txt` và `youtube-en.txt`: tiêu đề, mô tả và mốc chương tương ứng. Dòng đầu là tiêu đề, phần còn lại là mô tả.
- Hai ảnh `*-poster.jpg` có thể dùng làm thumbnail.

Upload hai MP4 riêng. Chọn Công khai hoặc Không công khai để giám khảo mở bằng link; chờ YouTube xử lý bản 1080p. Gửi lại link bản Việt và bản Anh cho Codex. Giữ video cũ đến khi hai link mới hoạt động.

Đã kiểm giải mã đầy đủ, thời lượng, chapter, âm lượng và biên phụ đề; đã kiểm contact sheet và khung hình từng phần. Lời đọc được đối chiếu timing và ASR, không tuyên bố có người đã nghe toàn bộ.

GitHub/Release và video cũ chưa được thay đổi. Chờ hai link mới rồi mới cập nhật và xử lý video cũ theo workflow đã chốt.
''',encoding='utf8')
(DEST/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
print(str(DEST));print('DELIVERED',len(manifest),'verified files')
