# 渠道错误通知 — 飞书机器人 & QQ 机器人配置教程

## 功能概述

当 AI 渠道出现连续请求失败或错误率过高时，系统会自动通过飞书机器人或 QQ 机器人向管理员发送告警通知。

支持两种告警触发条件（可同时开启）：
- **连续错误告警**：某个渠道连续失败 N 次后触发（默认 5 次）
- **错误率告警**：某个渠道在时间窗口内错误率超过阈值后触发（默认 80%，5 分钟窗口，最少 10 个请求）

通知内容示例：
```
通道「OpenAI-主力」（#3）连续错误 5 次
通道「OpenAI-主力」（#3）已连续出现 5 次请求错误。
最近错误：upstream returned 500 Internal Server Error
```

---

## 一、飞书机器人配置（推荐，最简单）

### 第一步：在飞书群中添加自定义机器人

1. 打开飞书，进入你要接收告警的群聊
2. 点击群聊右上角「...」→「设置」→「群机器人」→「添加机器人」
3. 选择「自定义机器人」
4. 填写机器人名称（如"New API 告警"），点击「添加」
5. 复制 **Webhook 地址**，格式如：
   ```
   https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
6. （可选）如果开启了「签名校验」，记下 **签名密钥（Secret）**

### 第二步：在 New API 中配置

1. 登录 New API 管理后台
2. 进入「个人设置」（经典模式）或「个人资料」→「设置与偏好」（默认模式）
3. 在「通知方式」中选择「飞书」
4. 填写：
   - **飞书 Webhook 地址**：粘贴第一步复制的 Webhook URL
   - **飞书 Webhook 密钥**：如果开启了签名校验则填写，否则留空
5. 保存设置

### 第三步：开启渠道错误告警

1. 进入「系统设置」→「运营设置」→「监控设置」
2. 找到「渠道错误告警」区域
3. 开启「连续错误告警」，设置阈值（如 5 次）
4. （可选）开启「错误率告警」，设置错误率阈值、时间窗口、最小请求数
5. 保存设置

### 验证

发送一个请求到一个已知会失败的渠道（如配置了错误 API Key 的渠道），连续发送超过阈值次数后，飞书群应收到告警卡片消息。

### 技术细节

- 消息格式：飞书交互卡片（Interactive Card），红色标题头
- 签名算法：`base64(hmac_sha256(timestamp + "\n" + secret))`
- API：`POST https://open.feishu.cn/open-apis/bot/v2/hook/{token}`
- 请求体：
  ```json
  {
    "timestamp": "1720000000",
    "sign": "xxxxxxxx（有密钥时才有此字段）",
    "msg_type": "interactive",
    "card": {
      "header": {
        "title": {"content": "通道「xxx」连续错误 5 次", "tag": "plain_text"},
        "template": "red"
      },
      "elements": [{
        "tag": "div",
        "text": {"content": "告警详情内容...", "tag": "lark_md"}
      }]
    }
  }
  ```

---

## 二、QQ 机器人配置

QQ 机器人使用腾讯 QQ 开放平台官方 API（`tencent-connect/botgo` SDK 同款协议）。

### 前置条件

- 需要一个 QQ 开放平台账号（个人或企业均可）
- 需要创建一个 QQ 机器人应用
- 群主需要在 QQ 客户端中开启「机器人主动在群聊内发言」

### 第一步：注册 QQ 开放平台并创建机器人

1. 访问 [QQ 开放平台](https://q.qq.com)，使用 QQ 账号登录
2. 完成个人实名认证（人脸识别）
3. 点击「机器人」→「创建机器人」
4. 填写机器人名称、头像、介绍
5. 创建完成后，在「开发管理」页面获取：
   - **AppID**：机器人 ID（纯数字）
   - **AppSecret**：机器人密钥（点击查看/重新生成，注意保存）

### 第二步：获取 group_openid

`group_openid` 是 QQ 平台为每个群分配的唯一标识（不是 QQ 群号），只能通过事件回调获取。

**方法：搭建临时 Webhook 接收器**

1. 在你的服务器上启动一个临时 HTTP 服务（需要公网可访问）：
   ```python
   # get_openid.py — 临时脚本，用完即删
   from http.server import HTTPServer, BaseHTTPRequestHandler
   import json

   class Handler(BaseHTTPRequestHandler):
       def do_POST(self):
           body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
           data = json.loads(body)
           print("\n" + "=" * 50)
           print(json.dumps(data, indent=2, ensure_ascii=False))
           print("=" * 50)

           # QQ 平台验证回调地址时会发 op=13 的验证请求
           if data.get("op") == 13:
               d = data.get("d", {})
               plain_token = d.get("plain_token", "")
               # 简单返回验证响应
               resp = json.dumps({"plain_token": plain_token, "signature": ""})
               self.send_response(200)
               self.send_header("Content-Type", "application/json")
               self.end_headers()
               self.wfile.write(resp.encode())
               return

           self.send_response(200)
           self.end_headers()
           self.wfile.write(b'{"op": 12}')

       def do_GET(self):
           self.send_response(200)
           self.end_headers()
           self.wfile.write(b'ok')

   print("Listening on :8080 — waiting for QQ events...")
   HTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
   ```

2. 运行：`python3 get_openid.py`

3. 在 QQ 开放平台管理端 → 开发设置 → 配置 Webhook 回调地址：
   ```
   http://你的服务器公网IP:8080
   ```

4. 订阅事件：勾选 `GROUP_AT_MESSAGE_CREATE`（群 @消息）

5. 在 QQ 群里 **@机器人** 发一条消息（如"测试"）

6. 你的终端会打印出事件数据，找到 `group_openid` 字段：
   ```json
   {
     "group_openid": "ABCDEF1234567890",
     "content": "测试",
     "author": {
       "member_openid": "xxxx"
     }
   }
   ```

7. 记下 `group_openid` 值，然后停止脚本（Ctrl+C），Webhook 地址可以删掉了

### 第三步：在 New API 中配置

1. 登录 New API 管理后台
2. 进入通知设置，选择「QQ 机器人」
3. 填写：
   - **QQ Bot AppID**：第一步获取的 AppID
   - **QQ Bot AppSecret**：第一步获取的 AppSecret
   - **消息目标类型**：选择「群消息」
   - **目标 OpenID**：第二步获取的 `group_openid`
4. 保存设置

### 第四步：开启渠道错误告警

同飞书的第三步，在「系统设置」→「运营设置」→「监控设置」中开启。

### 频率限制

- 机器人账号维度：企业认证 60 条/分钟，个人认证 60 条/分钟
- 单群维度：20 条/分钟
- 前提：群主需在 QQ 客户端开启「机器人主动在群聊内发言」设置

### 技术细节

- 认证流程：OAuth2，用 AppID + AppSecret 换取 Access Token（自动缓存，过期前自动刷新）
  ```
  POST https://bots.qq.com/app/getAppAccessToken
  Body: {"appId": "xxx", "clientSecret": "xxx"}
  Response: {"access_token": "xxx", "expires_in": "7200"}
  ```
- 发送群消息：
  ```
  POST https://api.sgroup.qq.com/v2/groups/{group_openid}/messages
  Header: Authorization: QQBot {access_token}
  Body: {"content": "告警内容", "msg_type": 0}
  ```
- 发送私聊消息：
  ```
  POST https://api.sgroup.qq.com/v2/users/{user_openid}/messages
  Header: Authorization: QQBot {access_token}
  Body: {"content": "告警内容", "msg_type": 0}
  ```

---

## 三、渠道错误告警配置项说明

在「系统设置」→「运营设置」→「监控设置」中配置：

| 配置项 | 说明 | 默认值 |
|-------|------|-------|
| 连续错误告警 | 开关。开启后当渠道连续错误达到阈值时发送通知 | 关闭 |
| 连续错误阈值 | 连续错误多少次后触发告警 | 5 |
| 错误率告警 | 开关。开启后当渠道错误率超过阈值时发送通知 | 关闭 |
| 错误率阈值 | 0-1 之间的小数，如 0.8 表示 80% | 0.8 |
| 错误率时间窗口 | 统计错误率的时间范围（分钟） | 5 |
| 错误率最小请求数 | 窗口内至少有多少个请求才计算错误率 | 10 |

### 告警行为

- 连续错误告警：渠道连续失败达到阈值后发送一次通知，之后不会重复发送，直到该渠道有一次成功请求（重置计数器），再次连续失败才会再次告警
- 错误率告警：当时间窗口内的错误率首次超过阈值时发送一次通知，有成功请求后重置
- 告警通知发送给 root 管理员用户（user ID = 1），使用该用户配置的通知方式
- 通知发送是异步的，不会阻塞正常的 API 请求处理
- 通知受系统的通知限流控制，每个渠道的告警独立限流

---

## 四、常见问题

### Q：飞书机器人收不到消息？
- 检查 Webhook URL 是否正确（完整复制，不要有多余空格）
- 检查签名密钥是否正确（如果开启了签名校验）
- 检查 New API 服务器是否能访问 `open.feishu.cn`（`curl https://open.feishu.cn` 测试）

### Q：QQ 机器人发送失败？
- 确认 AppID 和 AppSecret 是否正确
- 确认 `group_openid` 是否正确（不是 QQ 群号）
- 确认群主已开启「机器人主动在群聊内发言」
- 检查 New API 服务器是否能访问 `bots.qq.com` 和 `api.sgroup.qq.com`

### Q：告警没有触发？
- 确认已在「监控设置」中开启了告警开关
- 确认连续错误次数已达到阈值
- 检查 New API 日志中是否有 `failed to notify root user` 错误信息

### Q：每次都告警太频繁？
- 调大连续错误阈值（如改为 10）
- 告警不会重复发送——同一渠道触发告警后，必须有一次成功请求才会重置，之后再次连续失败才会再次告警
