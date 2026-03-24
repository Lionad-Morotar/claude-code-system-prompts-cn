<!--
name: 'Data: Files API reference — Python'
description: Python Files API reference including file upload, listing, deletion, and usage in messages
ccVersion: 2.1.73
-->
# Files API — Python

Files API 用于上传文件，以便在 Messages API 请求中使用。通过内容块中的 `file_id` 引用文件，避免在多次 API 调用中重复上传。

**Beta 版本：** 在 API 调用中传入 `betas=["files-api-2025-04-14"]`（SDK 会自动设置所需的请求头）。

## 关键信息

- 最大文件大小：500 MB
- 总存储空间：每个组织 100 GB
- 文件在删除前一直保留
- 文件操作（上传、列出、删除）免费；消息中使用的文件内容按输入 token 计费
- 在 Amazon Bedrock 或 Google Vertex AI 上不可用

---

## 上传文件

```python
import anthropic

client = anthropic.Anthropic()

uploaded = client.beta.files.upload(
    file=("report.pdf", open("report.pdf", "rb"), "application/pdf"),
)
print(f"File ID: {uploaded.id}")
print(f"Size: {uploaded.size_bytes} bytes")
```

---

## 在消息中使用文件

### PDF / 文本文档

```python
response = client.beta.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Summarize the key findings in this report."},
            {
                "type": "document",
                "source": {"type": "file", "file_id": uploaded.id},
                "title": "Q4 Report",           # 可选
                "citations": {"enabled": True}   # 可选，启用引用
            }
        ]
    }],
    betas=["files-api-2025-04-14"],
)
for block in response.content:
    if block.type == "text":
        print(block.text)
```

### 图片

```python
image_file = client.beta.files.upload(
    file=("photo.png", open("photo.png", "rb"), "image/png"),
)

response = client.beta.messages.create(
    model="{{OPUS_ID}}",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "What's in this image?"},
            {
                "type": "image",
                "source": {"type": "file", "file_id": image_file.id}
            }
        ]
    }],
    betas=["files-api-2025-04-14"],
)
```

---

## 管理文件

### 列出文件

```python
files = client.beta.files.list()
for f in files.data:
    print(f"{f.id}: {f.filename} ({f.size_bytes} bytes)")
```

### 获取文件元数据

```python
file_info = client.beta.files.retrieve_metadata("file_011CNha8iCJcU1wXNR6q4V8w")
print(f"Filename: {file_info.filename}")
print(f"MIME type: {file_info.mime_type}")
```

### 删除文件

```python
client.beta.files.delete("file_011CNha8iCJcU1wXNR6q4V8w")
```

### 下载文件

只有由代码执行工具或技能创建的文件才能下载（用户上传的文件不能下载）。

```python
file_content = client.beta.files.download("file_011CNha8iCJcU1wXNR6q4V8w")
file_content.write_to_file("output.txt")
```

---

## 完整端到端示例

上传一次文档，然后针对它提出多个问题：

```python
import anthropic

client = anthropic.Anthropic()

# 1. 上传一次
uploaded = client.beta.files.upload(
    file=("contract.pdf", open("contract.pdf", "rb"), "application/pdf"),
)
print(f"Uploaded: {uploaded.id}")

# 2. 使用相同的 file_id 提出多个问题
questions = [
    "What are the key terms and conditions?",
    "What is the termination clause?",
    "Summarize the payment schedule.",
]

for question in questions:
    response = client.beta.messages.create(
        model="{{OPUS_ID}}",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": question},
                {
                    "type": "document",
                    "source": {"type": "file", "file_id": uploaded.id}
                }
            ]
        }],
        betas=["files-api-2025-04-14"],
    )
    print(f"\nQ: {question}")
    text = next((b.text for b in response.content if b.type == "text"), "")
    print(f"A: {text[:200]}")

# 3. 使用完成后清理
client.beta.files.delete(uploaded.id)
```
