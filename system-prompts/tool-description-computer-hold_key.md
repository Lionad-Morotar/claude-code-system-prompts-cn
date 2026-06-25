<!--
name: 'Tool Description: Computer hold_key'
description: Describes the computer-use hold_key tool for pressing and holding keys or key combinations with allowlist and system-combo checks
ccVersion: 2.1.173
-->
按住一个键或组合键指定的时长，然后释放。调用此工具时，最前台的应用程序必须在会话允许列表（allowlist）中，否则此工具会返回错误且不执行任何操作。系统级组合键需要 `systemKeyCombos` 授权。
