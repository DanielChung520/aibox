# Agent Orchestrator + BPA 协作规格说明书

## 一、系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Task Chat (顶层)                                │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  - 一般聊天（LLM 直接回复）                                          ││
│  │  - 任务感知 + 初级编排                                               ││
│  │  - 路由到指定 BPA                                                    ││
│  │  - BPA 多轮对话的中转站                                              ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                              │                                          │
│                    ┌─────────┴─────────┐                               │
│                    │  Handoff Protocol │                               │
│                    └─────────┬─────────┘                               │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BPA Orchestrator                                │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  - 深层流程编排                                                      ││
│  │  - 进一步分解任务                                                    ││
│  │  - 调用 DA (Data Agent)                                             ││
│  │  - 多轮对话（通过 Top 与用户交互）                                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Data Agent (DA)                                 │
│                    数据抽象层：CRUD + 聚合计算                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、Task Chat 顶层架构

### 2.1 功能定义

| 功能 | 描述 |
|-----|------|
| **一般聊天** | 无需执行任务的闲聊、问答，LLM 直接回复 |
| **任务感知** | 检测用户输入是否包含工作任务 |
| **初级编排** | 简单拆分任务为子任务，不深入细节 |
| **BPA 路由** | 将任务交给指定的 BPA Agent 处理 |
| **消息中转** | BPA 与用户之间的多轮对话由此中转 |

### 2.2 消息流程

```
用户输入
    │
    ▼
┌───────────────────────┐
│  1. 一般聊天？        │──是──► LLM 直接回复 ──► 用户
└───────────┬───────────┘
            │否
            ▼
┌───────────────────────┐
│  2. 任务感知          │──否──► LLM 直接回复 ──► 用户
└───────────┬───────────┘
            │是
            ▼
┌───────────────────────┐
│  3. 初级编排          │  简单拆分为子任务
│  (Top Orchestrator)  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  4. 确认 + 指定 BPA   │  展示计划 + 用户确认
└───────────┬───────────┘
            │确认
            ▼
┌───────────────────────┐
│  5. Handoff to BPA    │
│  指定 bpa_id          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  6. BPA 处理          │
│  - 深层编排           │
│  - 调用 DA            │
│  - 需要用户输入时     │
│    通过 Top 询问      │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  7. 结果返回          │
│  (经过 Top 整合)      │
└───────────────────────┘
```

---

## 三、Top Orchestrator

### 3.1 核心职责

| 职责 | 描述 |
|-----|------|
| **会话管理** | 启动/切换/结束 Task Chat |
| **上下文管理** | 对话历史、跨轮次实体记忆 |
| **指代消解** | 将"那个订单"、"它"解析为具体实体 |
| **记忆** | 短期（会话内）+ 长期（用户偏好） |
| **任务感知** | 检测是否需要执行工作 |
| **初级编排** | 简单拆分任务为子任务 |
| **消息中转** | BPA ↔ 用户之间的消息传递 |

### 3.2 任务感知 Prompt

```
你是一个任务分类器。

判断用户消息是否需要执行工作任务：
- task: 需要执行操作（查询、执行、创建、修改、删除）
- chat: 闲聊、问答、情感表达

用户消息：{user_message}

输出 JSON：
{"intent": "task|chat", "confidence": 0.0-1.0}
```

### 3.3 初级编排 Prompt

```
用户需要完成一个任务，请进行简单的任务拆分。

任务：{user_task}

要求：
1. 只做简单拆分，不深入细节
2. 每个子任务应该清晰可理解
3. 标注每个子任务适合由哪个 BPA 处理（如果有）

输出格式：
{"subtasks": [{"id": 1, "description": "...", "bpa_hint": "..."}]}
```

### 3.4 指代消解 Prompt

```
以下是对话历史，找出"它/他/她/这个/那个"等指代词具体指代什么。

对话历史：
{history}

当前消息：{current_message}

输出 JSON：
{"resolved": "具体指代的内容", "entity_type": "order|customer|..."}
```

---

## 四、BPA Orchestrator

### 4.1 核心职责

| 职责 | 描述 |
|-----|------|
| **深层编排** | 详细的任务分解和流程编排 |
| **DA 调用** | 调用 Data Agent 执行数据操作 |
| **多轮对话** | 与用户交互获取信息/确认 |
| **状态管理** | 任务执行状态追踪 |
| **结果聚合** | 汇总各子任务结果 |

### 4.2 BPA 定义格式

```json
{
  "id": "order-bpa",
  "name": "订单管理 BPA",
  "description": "处理订单相关业务",
  "version": "1.0.0",
  
  "capabilities": [
    "order_query",
    "order_update",
    "return_process",
    "refund_execute"
  ],
  
  "tools": [
    "db-order-query",
    "db-order-update",
    "payment-refund"
  ],
  
  "prompts": {
    "task_decomposition": "你是一个订单管理专家...",
    "flow_orchestration": "根据任务类型，选择合适的流程...",
    "result_summary": "订单处理完成："
  }
}
```

### 4.3 动态注册

```python
class BPARegistry:
    """运行时动态注册 BPA"""
    
    def register(self, bpa_config: dict):
        bpa = BPAOrchestrator(bpa_config)
        self.bpas[bpa_config["id"]] = bpa
    
    def get(self, bpa_id: str) -> BPAOrchestrator:
        if bpa_id not in self.bpas:
            raise BPANotFoundError(f"BPA {bpa_id} 未注册")
        return self.bpas[bpa_id]
```

---

## 五、通信协议 (Handoff Protocol)

### 5.1 协议消息类型

| 消息类型 | 方向 | 描述 |
|---------|------|------|
| `TASK_HANDOVER` | Top → BPA | 启动任务 |
| `USER_MESSAGE` | Top → BPA | 转发用户消息 |
| `BPA_RESPONSE` | BPA → Top | BPA 回复 |
| `BPA_ASK_USER` | BPA → Top | BPA 需要用户输入 |
| `TASK_STATUS` | BPA → Top | 任务进度更新 |
| `TASK_COMPLETE` | BPA → Top | 任务完成 |
| `TASK_FAILED` | BPA → Top | 任务失败 |

### 5.2 TASK_HANDOVER (Top → BPA)

```json
{
  "type": "TASK_HANDOVER",
  "session_id": "sess_xxx",
  "user_id": "user_xxx",
  
  "handover_data": {
    "user_intent": "处理订单退货",
    "initial_message": "帮我处理订单OR-001的退货",
    
    "extracted_entities": {
      "order_id": "OR-001",
      "action": "return"
    },
    
    "top_level_subtasks": [
      {"id": 1, "description": "查询订单状态"},
      {"id": 2, "description": "检查退货条件"},
      {"id": 3, "description": "执行退货"}
    ],
    
    "conversation_context": {
      "language": "zh-TW",
      "user_preference": {}
    },
    
    "history": [
      {"role": "user", "content": "我想退货"},
      {"role": "assistant", "content": "请提供订单号"}
    ]
  },
  
  "timestamp": "2024-03-19T10:00:00Z"
}
```

### 5.3 BPA_RESPONSE / BPA_ASK_USER (BPA → Top)

```json
{
  "type": "BPA_RESPONSE",
  "session_id": "sess_xxx",
  "bpa_id": "order-bpa",
  
  "response": {
    "message": "订单OR-001状态为已发货，可以申请退货。",
    "needs_user_input": false,
    
    "task_status": {
      "task_1": {"status": "completed", "result": "已发货"},
      "task_2": {"status": "pending"},
      "task_3": {"status": "pending"}
    }
  },
  
  "timestamp": "2024-03-19T10:01:00Z"
}
```

```json
{
  "type": "BPA_ASK_USER",
  "session_id": "sess_xxx",
  "bpa_id": "order-bpa",
  
  "ask": {
    "question": "请确认退货原因：",
    "options": [
      {"id": "quality", "label": "质量问题"},
      {"id": "wrong_item", "label": "发错商品"},
      {"id": "changed_mind", "label": "不想要了"}
    ],
    "required": true
  },
  
  "task_status": {
    "task_1": "completed",
    "task_2": "running"
  },
  
  "timestamp": "2024-03-19T10:02:00Z"
}
```

### 5.4 TASK_COMPLETE (BPA → Top)

```json
{
  "type": "TASK_COMPLETE",
  "session_id": "sess_xxx",
  "bpa_id": "order-bpa",
  
  "result": {
    "summary": "订单OR-001退货已处理完成",
    
    "tasks": [
      {
        "id": 1,
        "description": "查询订单状态",
        "status": "completed",
        "result": {"status": "已发货", "can_return": true}
      },
      {
        "id": 2,
        "description": "检查退货条件",
        "status": "completed",
        "result": {"eligible": true, "reason": "未超过7天"}
      },
      {
        "id": 3,
        "description": "执行退货",
        "status": "completed",
        "result": {"return_id": "RET-001", "refund_amount": 299}
      }
    ],
    
    "next_actions": [
      "是否需要查看退款到账状态？"
    ]
  },
  
  "timestamp": "2024-03-19T10:05:00Z"
}
```

---

## 六、对话流程示例

### 6.1 一般聊天流程

```
👤 用户: "今天天气怎么样"
🤖 Top: 任务感知 → chat
🤖 LLM: 返回天气信息
👤  用户: "谢谢"
🤖 Top: chat → LLM直接回复
```

### 6.2 任务执行流程

```
👤 用户: "帮我处理订单OR-001的退货"
🤖 Top: 任务感知 → task
🤖 Top: 初级编排 → 拆分为3个子任务
🤖 Top: [展示计划]
    1. 查询订单状态
    2. 检查退货条件
    3. 执行退货
    
👤 用户: "确认"
🤖 Top: Handover to order-bpa

📦 order-bpa:
  - 深层编排: 确定具体流程
  - 调用 DA 查询订单 → 返回状态
  - 检查退货条件
  
📦 order-bpa → Top: "订单OR-001已发货，可申请退货，请确认退货原因"
👤 Top → 用户: "订单OR-001已发货，可申请退货，请确认退货原因：1.质量问题 2.发错商品 3.不想要了"

👤 用户: "质量问题"
📦 Top → order-bpa: 用户选择"质量问题"

📦 order-bpa:
  - 记录退货原因
  - 执行退货流程
  - 调用 DA 更新订单
  
📦 order-bpa → Top: TASK_COMPLETE

👤 Top: "订单OR-001退货已完成，退款金额299元将原路返回"
```

---

## 七、状态管理

### 7.1 Top 状态

```python
class TopState:
    def __init__(self):
        self.mode: str = "chat"              # chat | task
        self.active_bpa: Optional[str] = None  # 当前活跃的 BPA ID
        
        # 会话管理
        self.session_id: str = ""
        self.user_id: str = ""
        
        # 上下文
        self.entities: Dict[str, Any] = {}   # 当前会话记住的实体
        self.history: List[Message] = []     # 对话历史
        
        # 记忆
        self.short_term: Dict = {}           # 会话级记忆
        self.long_term: Dict = {}            # 用户偏好等
```

### 7.2 BPA 状态

```python
class BPAState:
    def __init__(self, bpa_id: str):
        self.bpa_id = bpa_id
        
        # 任务
        self.tasks: List[Task] = []
        self.current_task: Optional[str] = None
        
        # 执行状态
        self.status: str = "idle"            # idle | running | waiting | completed | failed
        
        # 中间结果
        self.results: Dict[str, Any] = {}
        
        # 与用户交互
        pending_questions: List[Question] = []
```

### 7.3 任务状态机

```
IDLE ──[接收任务]──► RUNNING
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
     COMPLETED    WAITING      FAILED
          │           │
          ▼           ▼
    [返回结果]  [等待用户输入]
                      │
                      ▼
               [用户输入后] ──► RUNNING
```

---

## 八、错误处理

### 8.1 错误类型

| 错误码 | 描述 | 处理方式 |
|-------|------|---------|
| `BPA_NOT_FOUND` | BPA 不存在 | 提示用户，检查 BPA ID |
| `BPA_TIMEOUT` | BPA 执行超时 | 重试或询问用户 |
| `BPA_ERROR` | BPA 执行失败 | 返回错误，询问重试 |
| `DA_ERROR` | Data Agent 错误 | BPA 自行处理 |
| `SESSION_LOST` | 会话丢失 | 重新初始化 |

### 8.2 错误响应格式

```json
{
  "type": "TASK_FAILED",
  "session_id": "sess_xxx",
  "bpa_id": "order-bpa",
  
  "error": {
    "code": "DA_ERROR",
    "message": "数据库连接失败",
    "can_retry": true
  },
  
  "partial_results": [
    {"task_id": 1, "status": "completed", "result": {...}}
  ],
  
  "suggested_actions": [
    "重试操作",
    "稍后再试"
  ],
  
  "timestamp": "2024-03-19T10:05:00Z"
}
```

---

## 九、后续讨论主题

规格基础已覆盖，后续可以讨论：

1. **Data Agent (DA) 详细设计**
   - 数据抽象方式
   - 支持的数据源类型
   - 与 BPA 的交互

2. **BPA 内部实现**
   - LangGraph 工作流
   - Task Decomposition Prompt

3. **前端交互设计**
   - 任务卡片展示
   - 确认/修改流程

4. **持久化方案**
   - 会话状态存储
   - 检查点机制

5. **安全与权限**
   - BPA 权限控制
   - 数据访问限制
