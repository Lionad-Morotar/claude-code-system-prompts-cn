<!--
name: 'Tool Description: Computer request_access'
description: Describes the computer-use request_access tool for asking user permission to control applications in the session
ccVersion: 2.1.173
-->
请求用户授予控制此会话中一组应用程序的权限。必须在调用此服务器中的任何其他工具之前调用。用户会看到一个列出所有请求应用程序的单一对话框，可以选择允许整个集合或拒绝。在会话进行中可以再次调用此工具以添加更多应用程序；之前已授予权限的应用程序保持已授权状态。返回已授予的应用程序、被拒绝的应用程序以及截图过滤能力。
