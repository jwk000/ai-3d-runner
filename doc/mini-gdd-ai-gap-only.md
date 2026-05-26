# mini-gdd-ai-gap-only

## 0. purpose
输出目标是一个极小型 3D 跑酷游戏。
只保留最小可玩闭环。
不要扩展为完整商业产品。
不要引入额外系统。

## 1. game_identity
- 游戏类型: 3D 自动前进跑酷
- 核心识别点:
  - 玩家在一个向前延伸的方形隧道内部奔跑
  - 隧道有 4 个可成为地面的面: floor / right / ceiling / left
  - 当前地面上有 3 条离散跑道: left / center / right
  - 左右输入是上下文相关:
    - 普通情况下 = 切道
    - 在边缘道且角色已起跳时 = 整个隧道旋转 90 度
- 玩法目标: 尽可能跑得更远
- 会话长度目标: 20s 到 90s
- 风格目标: 小游戏原型，不做大而全系统

## 2. player_role
玩家只控制一个角色。
玩家不控制前进方向。
玩家不控制镜头。
玩家不控制速度曲线以外的系统。
玩家唯一关心:
- 当前在哪个面
- 当前在哪条道
- 前方是否有空洞
- 什么时候跳
- 什么时候在空中翻面

## 3. core_loop
循环单位:
1. 游戏自动向前推进
2. 读取玩家当前状态:
   - current_face
   - current_lane
   - grounded / airborne
   - speed
   - upcoming_gaps
3. 玩家执行动作:
   - left
   - right
   - jump
   - no_op
4. 系统结算:
   - 普通左右输入触发切道
   - 边缘且空中时左右输入触发翻面
   - 如果脚下是空洞并且没有安全落点, 角色下落
   - 掉出隧道后游戏结束
5. 累加距离分数
6. 重复直到失败

## 4. observable_state
AI / 实现必须至少能访问以下状态:

- phase: running | game_over
- distance: float
- speed: float
- current_face: 0 | 1 | 2 | 3
- current_lane: 0 | 1 | 2
- grounded: boolean
- airborne: boolean
- rotating: boolean
- player_forward_z: float

前方内容最少需要:
- upcoming_gaps: array
- 每个 gap 至少包含:
  - z_start
  - z_end
  - face
  - lane_mask

lane_mask 定义:
- [true, true, true] 表示三条道都有洞
- [true, false, false] 表示仅 lane0 有洞
- [false, true, false] 表示仅 lane1 有洞
- [false, false, true] 表示仅 lane2 有洞
- true = 该道该区间是空洞
- false = 该道该区间可落脚

## 5. action_space
允许动作只有:
- left
- right
- jump
- no_op

动作规则:
- jump:
  - 仅 grounded 时有效
  - airborne 时无效
- left:
  - 若 current_lane > 0 且当前不是旋转触发态, 则切到左侧相邻道
  - 若 current_lane == 0 且 airborne == true, 则触发向左翻面
  - 若 current_lane == 0 且 grounded == true, 不翻面, 输入无效
- right:
  - 若 current_lane < 2 且当前不是旋转触发态, 则切到右侧相邻道
  - 若 current_lane == 2 且 airborne == true, 则触发向右翻面
  - 若 current_lane == 2 且 grounded == true, 不翻面, 输入无效

## 6. lane_model
- 跑道数量固定为 3
- lane index:
  - 0 = left
  - 1 = center
  - 2 = right
- 切道只允许相邻切换
- 不允许一次跨两道
- 切道应有短时间平滑过渡
- 但逻辑上始终落在离散 lane 中心

## 7. face_model
face index 固定循环:
- 0 = floor
- 1 = right
- 2 = ceiling
- 3 = left

翻面定义:
- 向左翻面:
  - 当前面切换到视觉左侧相邻面
  - 隧道整体旋转 90 度
- 向右翻面:
  - 当前面切换到视觉右侧相邻面
  - 隧道整体旋转 90 度

必须保证:
- 玩家视觉输入“向左”始终对应屏幕左
- 玩家视觉输入“向右”始终对应屏幕右
- 不允许出现控制方向和视觉相反的情况

## 8. jump_and_rotation_rules
最小规则:
- 玩家必须先跳起
- 只有 airborne 时才允许边缘翻面
- 翻面时长固定
- 翻面期间玩家不能再次触发新的翻面
- 翻面结束后玩家落在新地面
- 翻面存在明确目标 lane

推荐最小落点规则:
- 左翻后落到新地面的右侧道
- 右翻后落到新地面的左侧道

跳跃规则最小化:
- 单次跳跃
- 不支持二段跳
- 不支持滑铲
- 不支持冲刺
- 不支持墙跑

## 9. world_content
世界里只允许存在一种危险内容:
- gap

gap 定义:
- gap 是当前某个 face 的某个 lane 区间内没有地板
- 玩家若在该区间没有安全支撑则继续下落
- 下落超出隧道容许范围则 game_over


## 10. generation_rules
生成必须极简。
不要使用复杂保证算法。
不要使用 BFS 可解性修复。
不要使用复杂权重系统。

最小生成约束:
- 前方连续生成短段隧道
- 每段只描述:
  - 哪些 face 的哪些 lane 在某 z 区间是空洞
- 生成时遵守以下硬约束:
  - 出生后前若干米不能直接出现必死空洞
  - 任一时刻至少存在一种可行躲避方式:
    - 跳过
    - 切道
    - 跳后翻面
- 前 5 秒以教学为主:
  - 单一道空洞
  - 低密度
  - 给出明显反应时间
- 后续逐步增加:
  - 空洞长度
  - 空洞频率
  - 需要翻面的比例

## 11. failure_rule
唯一失败条件:
- 玩家掉出隧道

允许发生失败的典型情况:
- 没跳过空洞
- 切道太晚
- 没在边缘起跳翻面
- 翻面后没有落到安全道

不设置血量。
不设置受击减速。
不设置碰撞受伤。
不设置复活。

## 12. scoring
分数只由距离决定。
- score = distance
- distance 单调递增
- game_over 时展示本局 distance
- 可选: 本地最高距离
除此之外不要增加任何计分系统。

## 13. camera_and_feedback
镜头只做最小功能:
- 第三人称跟随
- 始终能看清前方数段地面
- 翻面时镜头跟随动作
- 不加入复杂特效

最小反馈:
- 起跳时有明显位移反馈
- 翻面时玩家能看出隧道确实翻转
- game_over 时立即停止并允许重开

不要加入:
- 电影化运镜
- boss 演出
- 音乐切换
- 屏幕震动系统
- 粒子系统
- 特殊奖励演出

## 14. minimal_parameters
这些参数必须集中配置:
- lane_count = 3
- face_count = 4
- start_speed
- max_speed
- speed_growth
- jump_height 或 jump_impulse
- gravity
- rotate_duration
- lane_switch_duration
- spawn_safe_distance
- gap_frequency
- gap_length_range

推荐方向:
- 速度从较低值开始
- 线性增速即可
- 翻面时间固定
- 跳跃滞空要足够覆盖翻面时间

## 15. out_of_scope
以下内容明确不做:
- 金币
- 障碍物
- 加速带
- 护盾
- Boss
- 特殊关卡
- 剧情
- 世界观
- 商业化
- 音频资源规划
- 美术资源采购
- 技术架构说明
- 对象池
- floating origin
- 复杂性能优化
- 复杂 UI
- roadmap
- 多平台适配
- 完整菜单系统
- 成就
- 任务
- 商店
- 社交
- live ops

## 16. acceptance_checks
若实现结果满足以下条件, 则视为符合本规格:
1. 角色自动前进
2. 当前地面有 3 条离散跑道
3. 左右键能正常切道
4. 角色起跳后, 在边缘按左右能触发整条隧道翻面
5. 世界中只有空洞这一种危险
6. 玩家掉出隧道后立即 game_over
7. 分数只显示距离
8. 不存在金币/障碍/Boss/道具/复杂 meta 系统

## 17. implementation_bias
如果实现时遇到“更丰富”与“更简单”冲突:
- 一律选择更简单
如果遇到“更真实”与“更清晰”冲突:
- 一律选择更清晰
如果遇到“更多内容”与“更稳定可玩”冲突:
- 一律选择更稳定可玩
