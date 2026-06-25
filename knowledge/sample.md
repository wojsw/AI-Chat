# AI-Flow 项目知识库示例

AI-Flow 是一个基于 Next.js 的 AI 聊天应用。它提供聊天页面、会话侧边栏、Markdown 消息渲染和服务端聊天接口。

## 当前能力

- 使用 Next.js App Router 构建应用页面和 API。
- 使用 Vercel AI SDK 与大模型进行流式对话。
- 使用 DeepSeek Chat 作为默认聊天模型。
- 使用本地文件系统保存聊天会话。
- 支持 Markdown、表格和代码块渲染。

## RAG 功能说明

RAG 是 Retrieval-Augmented Generation 的缩写，中文通常叫检索增强生成。它会先从知识库中检索与用户问题相关的资料，再把这些资料提供给大模型，让模型基于资料生成回答。

在 AI-Flow 的 MVP 实现中，RAG 使用本地 Markdown 或文本文件作为知识库来源。系统会把知识库文档切分成多个片段，为每个片段生成 Embedding，并在用户提问时检索最相关的片段。

## 使用建议

如果用户询问 AI-Flow 项目是什么，可以说明它是一个 Next.js AI 聊天应用。如果用户询问 RAG 如何工作，可以说明系统会先检索知识库，再把检索结果注入模型上下文。

## 注意事项

当前 RAG MVP 适合小型本地知识库验证，不适合直接承载大规模生产知识库。生产环境建议接入持久化向量数据库，例如 PostgreSQL pgvector、Qdrant、Milvus 或 Pinecone。
