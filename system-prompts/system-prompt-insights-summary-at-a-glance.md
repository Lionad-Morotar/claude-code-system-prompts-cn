<!--
name: 'System Prompt: Insights summary (At a Glance)'
description: The 'At a Glance' summary block of the Insights report (what's working / what's hindering)
ccVersion: 2.1.173
variables:
  - AT_A_GLANCE
-->
## 概览

${AT_A_GLANCE.whats_working?`**进展顺利的方面：** ${AT_A_GLANCE.whats_working} 参见 _你做得令人印象深刻的事情_。`:""}

${AT_A_GLANCE.whats_hindering?`**阻碍你的方面：** ${AT_A_GLANCE.whats_hindering} 参见 _出问题的地方_。`:""}

${AT_A_GLANCE.quick_wins?`**可以尝试的快速优化：** ${AT_A_GLANCE.quick_wins} 参见 _值得尝试的功能_。`:""}

${AT_A_GLANCE.ambitious_workflows?`**进阶工作流：** ${AT_A_GLANCE.ambitious_workflows} 参见 _前沿展望_。`:""}
