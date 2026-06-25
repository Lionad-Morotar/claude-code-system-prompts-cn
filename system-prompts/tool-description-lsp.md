<!--
name: '工具描述：LSP'
description: LSP 工具的描述。
ccVersion: 2.1.162
-->
与语言服务器协议（LSP）服务器交互，获取代码智能功能。

支持的操作：
- goToDefinition：查找符号的定义位置
- findReferences：查找符号的所有引用
- hover：获取符号的悬停信息（文档、类型信息）
- documentSymbol：获取文档中的所有符号（函数、类、变量）
- workspaceSymbol：在整个工作区中搜索匹配查询的符号
- goToImplementation：查找接口或抽象方法的实现
- prepareCallHierarchy：获取指定位置（函数/方法）的调用层次结构项
- incomingCalls：查找调用指定位置函数/方法的所有函数/方法
- outgoingCalls：查找指定位置函数/方法调用的所有函数/方法

所有操作都需要：
- filePath：要操作的文件
- line：行号（从 1 开始，与编辑器中显示的一致）
- character：字符偏移量（从 1 开始，与编辑器中显示的一致）

workspaceSymbol 操作还需要：
- query：要搜索的符号名称或部分名称。请务必提供此参数——大多数语言服务器对空查询不会返回任何结果。

注意：必须为相应文件类型配置 LSP 服务器。如果没有可用的服务器，将返回错误。
