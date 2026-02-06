Emova MCP 서버의 통합 테스트를 수행합니다.

## 단계

### 1. 빌드
```bash
npm run build
```
빌드 에러가 있으면 보고하고 중단하세요.

### 2. MCP 핸드셰이크 테스트
빌드된 서버에 MCP initialize 요청을 보내고 응답을 확인하세요:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | timeout 3 node build/index.js 2>/dev/null
```

응답에 다음이 포함되는지 확인:
- `"name": "emova-research"`
- `"version": "1.0.0"`
- `protocolVersion`

### 3. 단위 테스트
```bash
npm test
```

### 4. 결과 보고

```
## MCP 통합 테스트 결과

| 단계 | 결과 | 비고 |
|------|------|------|
| 빌드 | ✅/❌ | ... |
| MCP 핸드셰이크 | ✅/❌ | ... |
| 단위 테스트 | ✅/❌ | ... |
```

실패 항목이 있으면 원인을 분석하고 수정안을 제안하세요.

## 참고: MCP Inspector로 수동 테스트
더 상세한 대화형 테스트가 필요하면:
```bash
npx @modelcontextprotocol/inspector node build/index.js
```
