# Bịt Coin Mẹ! — BCM

## English

The token creates its fixed allocation once, in its constructor, directly in eight distinct recipient contracts. It uses OpenZeppelin ERC-20 transfers and holder-authorized `burn` / `burnFrom`. It has no owner, mint function, transfer controls or upgrade mechanism.

[Tokenomics](config/tokenomics.json) is the source of truth for metadata and allocations. The current implementation follows model A from [AGENTS.md](AGENTS.md), pending maintainer confirmation.

**Deployment is blocked.** Immutable locks, treasury Safe policy and liquidity proofs require maintainer decisions and implementation. Recipient contract code alone does not establish these properties. `verify:claims` verifies token evidence and returns failure while the economic proofs remain incomplete.

The previously published testnet deployment is **legacy v0.9**, with a different, mintable design. It does not represent this source.

## Tiếng Việt

Token tạo toàn bộ phân bổ cố định một lần trong hàm khởi tạo, trực tiếp tới tám hợp đồng nhận riêng biệt. Token sử dụng ERC-20 của OpenZeppelin và cho phép người nắm giữ đốt token qua `burn` / `burnFrom`, với quyền chi tiêu hợp lệ khi cần.

Token không có chủ sở hữu, chức năng tạo thêm token sau khi triển khai, cơ chế hạn chế chuyển token hoặc nâng cấp.

**Việc triển khai đang bị chặn.** Lịch khóa token, chính sách Safe của ngân quỹ và bằng chứng thanh khoản cần được quyết định, triển khai và kiểm chứng. Mã hợp đồng tại địa chỉ nhận không tự chứng minh các điều kiện này. Bản triển khai testnet cũ thuộc **legacy v0.9**.

## Development / Phát triển

Use the Node and pnpm versions pinned in `.nvmrc` and `package.json`. Local checks require no credentials. Environment files are not loaded automatically.

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check:tokenomics
pnpm compile
pnpm typecheck
pnpm test
pnpm lint
pnpm coverage
pnpm exec hardhat compile --force
pnpm check:forbidden
pnpm slither
pnpm audit --audit-level=low
pnpm hash:bytecode
```

The rebuild after coverage restores uninstrumented artifacts. Slither 0.11.5 must be installed separately. Coverage requires all statements, functions and branches in `contracts/` to be exercised.

`contracts/Tokenomics.sol` is generated from the JSON configuration. Regenerate it with `pnpm generate:tokenomics` only after a reviewed tokenomics change. The build checks reject drift.

`pnpm verify:claims` uses a read-only RPC supplied through `BCM_READ_RPC_URL` and a reviewed manifest selected by `BCM_DEPLOYMENT`. It never signs transactions. A successful source verification is separate from verification of locks, Safe governance and liquidity.

See [migration and release requirements](docs/MIGRATION.md) and [private vulnerability reporting](SECURITY.md). License: [MIT](LICENSE).
