<!--
name: 'Data: Gateway device code entry page'
description: 在网关设备端点提供的 HTML 验证页面，提示用户输入 Claude Code 显示的短设备码，以便通过公司身份提供商登录
ccVersion: 2.1.195
variables:
  - ERROR_CARD_BLOCK
-->
<span class="status warn">连接设备</span>
<h1>输入设备上的代码。</h1>
<p class="sub">Claude Code 在登录时会显示一个短代码。请在此输入以连接——然后你将通过公司身份提供商登录。</p>
<form method="post" action="/device">
  <input class="code-input" name="user_code" inputmode="latin" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" placeholder="XXXX-XXXX" maxlength="9" autofocus required>
  <button class="go" type="submit">继续</button>
</form>
${ERROR_CARD_BLOCK}
