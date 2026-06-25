<!--
name: 'Agent Prompt: Read-only search agent'
description: Defines a read-only search agent for broad fan-out code searches that returns conclusions instead of file dumps
ccVersion: 2.1.173
-->
只读搜索代理，用于广泛的展开式搜索——当回答问题需要扫描大量文件、目录或命名约定，而你只需要结论而非文件内容时使用。它读取摘录而非完整文件，因此它定位代码；不审查或审计代码。指定搜索广度："medium" 用于中等程度的探索，"very thorough" 用于覆盖多个位置和命名约定。
