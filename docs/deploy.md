## 部署

> [!WARNING]  
> 此项目需要至少一个托管在Cloudflare的域名

**获取 Cloudflare API 令牌**

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)

![](images/api_create_1.png)
![](images/api_create_2.png)
![](images/api_create_3.png)
![](images/api_create_4.png)

保存令牌并复制到 GitHub Secrets 中的 `CLOUDFLARE_API_TOKEN`

**获取 Cloudflare 账户 ID**
1. 账户 ID 可以在 Cloudflare 仪表盘的账户设置中找到。
2. 复制到 GitHub Secrets 中的 `CLOUDFLARE_ACCOUNT_ID`

**获取 D1 数据库 ID**
访问 [D1 数据库](https://dash.cloudflare.com/?to=/:account/workers/d1) 页面
![](images/worker_d1_1.png)
![](images/worker_d1_2.png)
![](images/worker_d1_3.png)

复制到 GitHub Secrets 中的 `D1_DATABASE_ID`

**配置 Github 仓库**

1. Fork 仓库 [bestruirui/Alle](https://github.com/bestruirui/Alle/fork)
2. 进入您的 GitHub 仓库设置
3. 转到 Settings → Secrets and variables → Actions → New Repository secrets
4. 添加以下 Secrets：

| Secret 名称             | 必需 | 用途                                                  |
| ----------------------- | :--: | ----------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  |  ✅  | Cloudflare API 令牌（需要 Workers 和相关资源权限）     |
| `CLOUDFLARE_ACCOUNT_ID` |  ✅  | Cloudflare 账户 ID                                    |
| `D1_DATABASE_ID`        |  ✅  | 您的 D1 数据库的 ID                                   |
| `USERNAME`              |  ✅  | 您的邮箱用户名                                        |
| `PASSWORD`              |  ✅  | 您的邮箱密码                                          |
| `OPENAI_API_KEY`        |  ❌  | OpenAI API 密钥,默认使用Worker AI                     |
| `OPENAI_BASE_URL`       |  ❌  | OpenAI API 基础 URL,默认使用Worker AI                 |

![](images/github_1.png)
5. 添加以下 Variables

| Variables              | 必需 | 用途                                                    |
| ----------------------- | :--: | ----------------------------------------------------- |
| `ENABLE_AI_EXTRACT`     |  ❌  | 是否启用 AI 识别,默认不启用                           |
| `EXTRACT_MODEL`         |  ❌  | AI 识别模型,模型需要支持JSON Mode                     |
| `ENABLE_AUTO_DEL`       |  ❌  | 是否启用自动删除过期邮件,默认不启用                    |
| `AUTO_DEL_TYPE`         |  ❌  | 自动删除过期邮件类型,多个类型用逗号分隔                |
| `AUTO_DEL_CRON`         |  ❌  | 自动删除过期邮件定时任务,默认不启用                    |
| `AUTO_DEL_TIME`         |  ❌  | 自动删除过期邮件时间,单位秒                            |
| `JWT_MIN_TTL`           |  ❌  | JWT 最小 TTL,默认300s                                 |
| `JWT_MAX_TTL`           |  ❌  | JWT 最大 TTL,默认6000s                                |
| `TELEGRAM_TEMPLATE`     |  ❌  | Telegram 消息模板                                     |
| `TELEGRAM_TYPE`         |  ❌  | Telegram 发送的邮件类型                               |

![](images/github_2.png)

6. 如需使用Telegram Bot通知，还需添加以下 Secrets：

| Secret 名称             | 必需 | 用途                                                  |
| ----------------------- | :--: | ----------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`    |  ❌  | Telegram Bot Token                                    |
| `TELEGRAM_CHAT_ID`      |  ❌  | Telegram Chat ID                                      |



**运行工作流**
1. 然后在Action页面手动运行工作流
2. 后期更新手动点击Sync Upstream按钮即可

**启用邮件转发**

1.访问[邮件转发](http://dash.cloudflare.com/?to=/:account/:zone/email/routing/routes)页面

2.设置邮件转发到alle

![](images/forward_1.png)

域名为 `example.com`, 则转发地址为 `任意值@example.com`

例如 `temp@example.com`,`alle@example.com`,`any@example.com` 这些地址收到的邮件都会显示在Alle中


## 邮件类型

| 类型 | 描述 |
| ---  | --- |
| auth_code | 授权码 |
| auth_link | 授权链接 |
| service_link | 服务链接,例如Github的pr请求通知 |
| subscription_link | 广告链接的退订链接 |
| other_link | 其他链接 |
| none | 无 |

## AI 识别


`ENABLE_AI_EXTRACT`填写true

- 直接使用 Woreker AI

这里挑一个模型 [Cloudflare Workers AI 支持的模型](https://developers.cloudflare.com/workers-ai/features/json-mode/#supported-models) 填写 `EXTRACT_MODEL`

- 自定义模型

需要支持JSON MODE,填写`OPENAI_API_KEY`,`OPENAI_BASE_URL`,`EXTRACT_MODEL`

## 自动移入垃圾箱

`ENABLE_AUTO_DEL`填写true。匹配的邮件会先移入垃圾箱，不会直接永久删除。

`AUTO_DEL_TYPE` 支持的邮件类型

多种类型使用英文逗号分隔,示例
```
AUTO_DEL_TYPE=auth_code,auth_link,service_link,subscription_link,other_link
```

`AUTO_DEL_TIME` 自动删除过期邮件时间,单位秒

`AUTO_DEL_CRON` 收件箱自动清理时刻；独立的每小时触发器负责清除超过 7 天的垃圾箱邮件。

## WebHook 通知

`WEBHOOK_URL` WebHook URL

`WEBHOOK_TYPE` WebHook 发送的邮件类型

多种类型使用英文逗号分隔,示例

```
WEBHOOK_TYPE=auth_code,auth_link,service_link,subscription_link,other_link

```
`WEBHOOK_TEMPLATE` WebHook 模板

模板支持的变量

| 变量 | 描述 |
| --- | --- |
| messageId | 邮件ID |
| fromAddress | 发件人地址 |
| fromName | 发件人名称 |
| toAddress | 收件人地址 |
| recipient | 收件人 |
| title | 邮件标题 |
| bodyText | 邮件文本内容 |
| bodyHtml | 邮件HTML内容 |
| sentAt | 发送时间 |
| receivedAt | 接收时间 |
| emailType | 邮件类型 |
| emailResult | 邮件结果 |
| emailResultText | 邮件结果文本 |
| emailError | 邮件错误 |

注意 WebHook 模板 需要转义,下方是一个示例
```
{\"text\":{\"content\":\"{{fromName}}  {{emailResult}}\"},\"msgtype\":\"text\",}
```

## Telegram Bot 通知

`TELEGRAM_BOT_TOKEN` Telegram Bot Token

`TELEGRAM_CHAT_ID` Telegram Chat ID

`TELEGRAM_TYPE` Telegram 发送的邮件类型

多种类型使用英文逗号分隔,示例

```
TELEGRAM_TYPE=auth_code,auth_link,service_link,subscription_link,other_link
```

`TELEGRAM_TEMPLATE` Telegram 消息模板

模板支持的变量与WebHook相同，支持HTML格式，示例：
```
<b>新邮件通知</b>
发件人: {fromName}
标题: {title}
类型: {emailType}
结果: {emailResult}
```

## 垃圾箱（保留 7 天）

删除和批量删除现在将邮件移入垃圾箱。点击列表顶部的“垃圾箱”查看邮件，并恢复单封或选中邮件。
以 `deleted_at`（UTC 移入时间）计算期限，超过 7 × 24 小时后由每小时任务永久删除；清除可能在到期后的下一小时发生。
重复移入不会重新计时。恢复会清除移入时间并保留正文、识别结果和已读状态。
如果启用了收件箱自动清理，恢复后仍符合其类型/时间规则的邮件会在下一次自动清理时再次移入垃圾箱。

`GET /api/email/list` 默认只返回收件箱；`folder=trash` 返回垃圾箱。
`DELETE /api/email/delete` 只进行软删除；`POST /api/email/restore` 接收 ID 数组。
每个删除/恢复请求最多 99 个 ID，界面的批量操作自动分批。没有立即永久删除或清空垃圾箱接口。

部署前先应用 `0003_add_trash.sql`，再部署 Worker。GitHub Actions 已按该顺序执行；旧代码能兼容新增列，但不要回滚到旧的永久删除接口。
迁移保留已有邮件，所有已有记录的 `deleted_at` 初始为 NULL。
若直接维护 D1 查询（例如邮件摘要），需要加 `WHERE deleted_at IS NULL`，避免读到垃圾箱邮件。
启用每小时清除前确认生产 D1 绑定与这项永久删除策略；没有 Cloudflare 管理权限扩展。

本地验证使用 Node.js 24：`npm ci`、`npm test`、`npx tsc --noEmit`、`npm run build`。

## 邮件列表与正文 API

`GET /api/email/list` 返回分页摘要，`bodyText` 和 `bodyHtml` 为 `null`，避免一次加载几十封完整正文导致 Worker CPU 超限。阅读正文请使用同一登录授权调用 `GET /api/email/body?id=<邮件 ID>`，返回 `{ bodyText, bodyHtml }`。该接口也支持垃圾箱邮件，不改变已读状态。客户端会在打开邮件时加载正文，并显示加载失败及重试入口。

## 归档与未读收件箱

`0004_add_archive.sql` 新增可空的 `archived_at` 及索引，保留已有邮件和已读状态。数据库约束禁止 `archived_at` 与 `deleted_at` 同时非空。收件箱为两者均 NULL；归档为 `archived_at` 非空且 `deleted_at` 为 NULL；垃圾箱为 `deleted_at` 非空且 `archived_at` 为 NULL。

`POST /api/email/archive` 接收 1–99 个正整数 ID，将收件箱邮件归档；重复请求保留原归档时间，垃圾箱邮件须先恢复到收件箱。`POST /api/email/restore` 可将归档或垃圾箱邮件恢复到收件箱，同时清空两个时间字段。两种操作都保留 `read_status`。界面支持单封和批量操作；查看归档不会自动标为已读。手动将归档移入垃圾箱时清空归档标记，并从此时计算 7 天保留期。

列表与收件人 API 支持 `folder=archive`。列表 `q`（最多 200 字符）在当前文件夹搜索主题、发件人、收件地址和纯文本正文，可结合 `read_status`、收件人及类型筛选；百分号和下划线按字面搜索。正文继续按需读取，不随分页列表返回。归档和垃圾箱均不计入默认收件箱及其未读数；归档不会批量改变邮件的已读状态。

归档长期保留：旧的按类型/时间自动清理与垃圾箱 7 天清除均排除归档。恢复后的邮件重新参与原有收件箱自动清理规则。直接查询收件箱（包括定时摘要）必须同时过滤 `deleted_at IS NULL AND archived_at IS NULL`；若需要整理归档，另行查询归档文件夹。

上线顺序：确认后应用 `0004_add_archive.sql`，部署包含归档功能的 Worker，再整理现有邮件。迁移本身不归档、不删除、不标记已读。GitHub Actions 已先迁移再部署；不要在归档了邮件后回滚到缺少归档过滤的旧版。此前的垃圾箱策略及 cron 不变。
