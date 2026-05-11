# .githooks/

このリポジトリでバージョン管理する Git hook 集。
デフォルトでは Git は `.git/hooks/` を参照するので、このディレクトリは**1度だけ有効化**する必要があります。

## 有効化

リポジトリのルートで以下を1回だけ実行:

```bash
git config core.hooksPath .githooks
```

これでクローン後の開発者全員に hook が適用されます。
(Windows でも Git for Windows / WSL 環境であれば bash で動きます)

## 内容

### `pre-commit`
コミット前に、ステージ済み diff に機密値が紛れ込んでないかチェックします。
検出パターン:
- Gemini / Google AI Studio の API Key (`AIzaSy...`)
- `GEMINI_API_KEY=<non-empty>` の形
- OpenAI API Key (`sk-...`)
- GitHub Personal Access Token (`ghp_` / `gho_` / `ghs_`)

検出されると commit は中止されます。
誤検知の場合のみ `git commit --no-verify` で迂回可 (本物の機密値が紛れてないか必ず確認すること)。

## 既存環境への影響

`core.hooksPath` を設定しても、既存の `.git/hooks/` は影響を受けません
(参照先が変わるだけ)。元に戻したい場合は:

```bash
git config --unset core.hooksPath
```
