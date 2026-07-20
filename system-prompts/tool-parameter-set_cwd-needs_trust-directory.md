<!--
name: 'Tool Parameter: set_cwd needs_trust directory'
description: Describes the canonical target directory returned by a set_cwd needs_trust response, which the SDK host must show in a trust dialog and echo back verbatim on accept
ccVersion: 2.1.200
-->
规范目标目录。无变化；请为此字符串精确显示信任对话框，接受后重新发送并附带 trust_accepted: true 和 trusted_directory 原样回显。由于构造原因，可在对话框中原样安全渲染：每个字符都是可见的、可与空格区分的字形。规范路径中包含控制字符（Cc）、格式字符（Cf）、默认可忽略字符、行/段分隔符（Zl/Zp）、非 ASCII 空格 Zs 或盲文空白码点的目标在此之前会被拒绝（原因：unsafe_path），因此不会进入此分支。
