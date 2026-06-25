<!--
name: '数据：Files API 参考 — Go'
description: Go Files API 参考，包括文件上传、列表、删除以及在消息中的使用
ccVersion: 2.1.182
-->
# Files API — Go

## Files API（Beta）

位于 `client.Beta.Files`。方法名为 **`Upload`**（而非 `New`/`Create`），参数结构体为 `BetaFileUploadParams`。`File` 字段接受 `io.Reader`；使用 `anthropic.File()` 附加文件名和 content-type 以实现 multipart 编码。

```go
f, _ := os.Open("./upload_me.txt")
defer f.Close()

meta, err := client.Beta.Files.Upload(ctx, anthropic.BetaFileUploadParams{
    File:  anthropic.File(f, "upload_me.txt", "text/plain"),
    Betas: []anthropic.AnthropicBeta{anthropic.AnthropicBetaFilesAPI2025_04_14},
})
// meta.ID 即 file_id，可在后续消息请求中引用
```

其他 `Beta.Files` 方法：`List`、`Delete`、`Download`、`GetMetadata`。

---
