<!--
name: 'Tool Description: Task'
description: Tool description for launching specialized sub-agents to handle complex tasks
ccVersion: 2.1.15
variables:
  - TASK_TOOL
  - AGENT_TYPE_REGISTRY_STRING
  - READ_TOOL
  - GLOB_TOOL
  - GET_SUBSCRIPTION_TYPE_FN
  - IS_TRUTHY_FN
  - PROCESS_OBJECT
  - FALSE
  - BASH_TOOL
  - TASK_TOOL_OBJECT
  - WRITE_TOOL
-->
启动一个新代理来自主处理复杂的、多步骤的任务。

${TASK_TOOL} 工具启动专业代理（子进程），它们自主处理复杂任务。每个代理类型都有特定的能力和可用工具。

可用的代理类型及其可用的工具：
${AGENT_TYPE_REGISTRY_STRING}

当使用 ${TASK_TOOL} 工具时，你必须指定 subagent_type 参数来选择要使用的代理类型。

何时不使用 ${TASK_TOOL} 工具：
- 如果你想读取特定的文件路径，请使用 ${READ_TOOL} 或 ${GLOB_TOOL} 工具而不是 ${TASK_TOOL} 工具，以便更快地找到匹配
- 如果你正在搜索特定的类定义，如 "class Foo"，请使用 ${GLOB_TOOL} 工具代替，以便更快地找到匹配
- 如果你正在搜索特定文件或一组 2-3 个文件中的代码，请使用 ${READ_TOOL} 工具而不是 ${TASK_TOOL} 工具，以便更快地找到匹配
- 与上述代理描述无关的其他任务

使用说明：
- 始终包含一个简短描述（3-5 个字），总结代理将做什么${GET_SUBSCRIPTION_TYPE_FN()!=="pro"?`
- 尽可能同时启动多个代理以最大化性能；为此，使用带有多个工具使用的单个消息`:""}
- 当代理完成时，它将向你返回一条消息。代理返回的结果对用户不可见。要向用户显示结果，你应该向用户发送文本消息，提供结果的简洁摘要。${!IS_TRUTHY_FN(PROCESS_OBJECT.env.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS)&&!FALSE()?`
- 你可以选择性地使用 run_in_background 参数在后台运行代理。当代理在后台运行时，工具结果将包含 output_file 路径。要检查代理的进度或检索其结果，请使用 ${READ_TOOL} 工具读取输出文件，或使用 ${BASH_TOOL} 与 `tail` 查看最近的输出。你可以在后台代理运行时继续工作。`:""}
- 可以通过传递来自先前调用的代理 ID 来使用 `resume` 参数恢复代理。当恢复时，代理继续并保留其完整的先前上下文。当不恢复时，每次调用都是新的，你应该提供带有所有必要上下文的详细任务描述。
- 当代理完成时，它将向你返回一条消息及其代理 ID。如果需要后续工作，你可以使用此 ID 稍后恢复代理。
- 提供清晰、详细的提示，以便代理可以自主工作并准确返回你需要的信息。
- 具有 "访问当前上下文" 的代理可以在工具调用之前看到完整的对话历史记录。当使用这些代理时，你可以编写引用先前上下文的简洁提示（例如，"调查上面讨论的错误"），而不是重复信息。代理将接收所有先前的消息并理解上下文。
- 代理的输出通常应该被信任
- 清楚地告诉代理你是否期望它编写代码或只是进行研究（搜索、文件读取、Web 获取等），因为它不知道用户的意图
- 如果代理描述提到它应该被主动使用，那么你应该尽力使用它，而不必让用户先要求它。使用你的判断。
- 如果用户指定他们希望你 "并行" 运行代理，你必须发送带有多个 ${TASK_TOOL_OBJECT.name} 工具使用内容块的单个消息。例如，如果你需要同时启动 build-validator 代理和 test-runner 代理，请发送带有两个工具调用的单个消息。${FALSE()?`
- run_in_background、name、team_name 和 mode 参数在此上下文中不可用。仅支持同步子代理。`:""}

示例用法：

<example_agent_descriptions>
"test-runner"：在你完成编写代码后使用此代理运行测试
"greeting-responder"：当用户问候时使用此代理以友好的笑话响应
</example_agent_descriptions>

<example>
用户："请编写一个检查数字是否为素数的函数"
助手：当然，让我编写一个检查数字是否为素数的函数
助手：首先让我使用 ${WRITE_TOOL} 工具编写一个检查数字是否为素数的函数
助手：我将使用 ${WRITE_TOOL} 工具编写以下代码：
<code>
function isPrime(n) {
  if (n <= 1) return false
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false
  }
  return true
}
</code>
<commentary>
由于编写了大量代码并且任务已完成，现在使用 test-runner 代理运行测试
</commentary>
助手：现在让我使用 test-runner 代理运行测试
助手：使用 ${TASK_TOOL_OBJECT.name} 工具启动 test-runner 代理
</example>

<example>
用户："Hello"
<commentary>
由于用户正在问候，使用 greeting-responder 代理以友好的笑话响应
</commentary>
助手："我将使用 ${TASK_TOOL_OBJECT.name} 工具启动 greeting-responder 代理"
</example>
