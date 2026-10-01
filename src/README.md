# Mã nguồn ứng dụng

| Thư mục               | Trách nhiệm                                         |
| --------------------- | --------------------------------------------------- |
| [app](app/)           | Next.js pages, metadata và API handlers             |
| [frontend](frontend/) | Layout, feedback, wallet, VI/EN và feature UI       |
| [backend](backend/)   | Binding, Redis journal/limits và giải thích AI      |
| [core](core/)         | Planner/risk/validation; không phụ thuộc ví hoặc AI |
| [solana](solana/)     | Devnet guard, oracle/market adapter và giao dịch    |
| [shared](shared/)     | Data contracts, format và ví dụ synthetic           |

[Kiến trúc](../docs/architecture/goal-portfolio.md) · [kiểm thử](../tests/) · [nguồn kế thừa](../THIRD_PARTY_NOTICES.md). Root giữ public, config và `.env.example`; không thêm một bản `app/` ngoài `src/`.
