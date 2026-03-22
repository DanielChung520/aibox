# SAP数据查询Agent规格书（聚焦数据库架构、意图识别、SQL模板）

# 1. 文档概述

## 1.1 文档目的

本文档聚焦SAP数据查询Agent（以下简称“Agent”）的三大核心模块——数据库架构、意图识别、SQL模板，明确各模块的设计规范、功能要求及技术细节，作为该三大核心模块开发、测试、验收的核心标准，确保Agent可实现“自然语言意图识别→SQL模板匹配/生成→数据库查询”的核心流程，适配现有SAP数据湖（MM、SD模块为主），保障查询准确性与效率。

## 1.2 适用范围

本文档适用于Agent核心模块（数据库架构、意图识别、SQL模板）的开发、测试及运维人员，明确三大模块的设计逻辑、技术选型及验收标准，聚焦核心功能，简化非相关冗余内容。

## 1.3 核心目标

- 设计适配SAP MM/SD模块的数据库架构，实现Schema知识库的高效存储、查询与更新，支撑后续意图识别与SQL生成；
- 实现精准的自然语言意图识别，能解析用户查询需求，提取关键要素，为SQL模板匹配/生成提供明确依据；
- 设计贴合SAP表规范、数据湖SQL语法的SQL模板体系，结合LLM优化模板调用与生成逻辑，确保生成的SQL可直接执行、无冗余。

## 前置条件

- 现有SAP数据湖已部署完成，包含MM、SD模块核心表，支持标准SQL查询（如Athena、Trino、Hive等）；
- 已获取SAP数据湖核心表的Schema信息（表名、字段名、字段类型、字段含义、表关联关系）及只读查询权限；
- 已选定适配的LLM模型（支持SQL生成与模板优化），完成模型调用环境配置；
- 用户具备基础SAP MM/SD业务知识，无需掌握SQL编写及数据库技术细节。

# 2. 核心模块详细设计

## 2.1 数据库架构设计

数据库架构核心为Schema知识库的设计与存储，采用关系型数据库搭建，聚焦SAP MM/SD模块核心表的Schema管理，支撑意图识别的表匹配、SQL模板的字段关联，实现高效查询与灵活更新，整体架构分为存储层、访问层两层，解耦设计便于维护。Schema知识库基于SAP MM/SD模块标准数据表及数据湖适配规范构建，以下为收集整理的MM/SD模块完整核心表及数据湖Schema详情（含所有核心表完整字段，非仅MARA表）。

### 2.1.1 存储层设计

采用MySQL 8.0+或PostgreSQL 12+作为存储载体，核心设计3张基础表（table_info、field_info、table_relation），分别存储表信息、字段信息、表关联信息，确保Schema数据的结构化存储与关联查询；同时结合收集到的SAP MM/SD模块核心表详情，完善Schema知识库的基础数据，具体设计如下：

#### 2.1.1.1 表信息表（table_info）

存储SAP MM/SD模块核心表的基础信息，关联数据湖中的实际数据表，表结构及初始化数据（基于收集的MM/SD核心表）如下：

| 字段名                                        | 字段类型     | 字段含义       | 是否主键 | 备注                              |
| --------------------------------------------- | ------------ | -------------- | -------- | --------------------------------- |
| table_id                                      | VARCHAR(50)  | 表唯一标识     | 是       | 格式：模块_表名（如MM_EKKO）      |
| table_name                                    | VARCHAR(100) | SAP表名        | 否       | 如EKKO、MSEG、VBAK等              |
| module                                        | VARCHAR(20)  | 所属模块       | 否       | 仅支持MM、SD                      |
| table_desc                                    | VARCHAR(200) | 表用途描述     | 否       | 基于SAP标准表用途补充             |
| update_time                                   | DATETIME     | 更新时间       | 否       | 表结构变更时更新                  |
| data_lake_table                               | VARCHAR(100) | 数据湖对应表名 | 否       | 与SAP表名一致，适配数据湖命名规范 |
| table_info初始化核心数据（MM/SD模块核心表）： |              |                |          |                                   |

| table_id | table_name | module | table_desc                                                       | data_lake_table |
| -------- | ---------- | ------ | ---------------------------------------------------------------- | --------------- |
| MM_MARA  | MARA       | MM     | 物料主数据表，存储物料全局唯一标识及基础分类信息                 | MARA            |
| MM_LFA1  | LFA1       | MM     | 供应商主记录表，存储供应商详细信息、地址及支付条件               | LFA1            |
| MM_EKKO  | EKKO       | MM     | 采购订单抬头表，存储采购订单整体信息                             | EKKO            |
| MM_EKPO  | EKPO       | MM     | 采购订单行项目表，存储采购订单具体物料、数量等信息               | EKPO            |
| MM_MSEG  | MSEG       | MM     | 库存移动记录表，存储库存入库、出库、转移等详细变动信息           | MSEG            |
| SD_VBAK  | VBAK       | SD     | 销售订单抬头表，存储销售订单整体信息（订单号、客户、订单类型等） | VBAK            |
| SD_VBAP  | VBAP       | SD     | 销售订单行项目表，存储销售订单具体物料、数量、单价等信息         | VBAP            |
| SD_LIKP  | LIKP       | SD     | 交货单抬头表，存储交货单整体信息                                 | LIKP            |
| SD_LIPS  | LIPS       | SD     | 交货单行项目表，存储交货单具体物料、交货数量等信息               | LIPS            |
| SD_RBKD  | RBKD       | SD     | 开票凭证数据表，存储开票相关核心信息                             | RBKD            |

#### 2.1.1.2 字段信息表（field_info）

存储SAP MM/SD模块核心表的字段详情，关联table_info表，补充数据湖字段适配信息，表结构及核心字段初始化数据如下（含所有核心表完整字段，非仅MARA）：

| 字段名                                                                                             | 字段类型     | 字段含义       | 是否主键 | 备注                                               |
| -------------------------------------------------------------------------------------------------- | ------------ | -------------- | -------- | -------------------------------------------------- |
| field_id                                                                                           | VARCHAR(50)  | 字段唯一标识   | 是       | 格式：表ID_字段名（如MM_EKKO_EBELN）               |
| table_id                                                                                           | VARCHAR(50)  | 关联表ID       | 否       | 关联table_info表的table_id                         |
| field_name                                                                                         | VARCHAR(100) | SAP字段名      | 否       | 与SAP表字段名一致，适配数据湖字段规范              |
| field_type                                                                                         | VARCHAR(50)  | 字段类型       | 否       | SAP字段类型，适配数据湖字段类型（如CHAR→VARCHAR） |
| field_desc                                                                                         | VARCHAR(200) | 字段中文含义   | 否       | 基于SAP标准字段含义补充                            |
| is_primary_key                                                                                     | BOOLEAN      | 是否主键       | 否       | true=是，false=否                                  |
| relation_table_id                                                                                  | VARCHAR(50)  | 关联表ID       | 否       | 外键关联的表ID，无关联则为空                       |
| relation_field_id                                                                                  | VARCHAR(50)  | 关联字段ID     | 否       | 关联表对应的字段ID，无关联则为空                   |
| data_lake_field_type                                                                               | VARCHAR(50)  | 数据湖字段类型 | 否       | 适配Athena/Trino等数据湖的字段类型                 |
| field_info核心初始化数据（MM/SD模块所有核心表完整字段，非仅MARA，基于网络收集的SAP标准字段补充）： |              |                |          |                                                    |

| field_id         | table_id | field_name | field_type | field_desc           | is_primary_key | data_lake_field_type |
| ---------------- | -------- | ---------- | ---------- | -------------------- | -------------- | -------------------- |
| MM_MARA_MATERIAL | MM_MARA  | MATERIAL   | CHAR(18)   | 物料编号             | true           | VARCHAR(18)          |
| MM_MARA_MATKL    | MM_MARA  | MATKL      | CHAR(10)   | 物料组               | false          | VARCHAR(10)          |
| MM_MARA_MTART    | MM_MARA  | MTART      | CHAR(4)    | 物料类型             | false          | VARCHAR(4)           |
| MM_MARA_MEINS    | MM_MARA  | MEINS      | UNIT(3)    | 基本计量单位         | false          | VARCHAR(3)           |
| MM_MARA_BISMT    | MM_MARA  | BISMT      | CHAR(18)   | 物料旧编号           | false          | VARCHAR(18)          |
| MM_MARA_MAKTX    | MM_MARA  | MAKTX      | CHAR(40)   | 物料描述（中文）     | false          | VARCHAR(40)          |
| MM_LFA1_LIFNR    | MM_LFA1  | LIFNR      | CHAR(10)   | 供应商编号           | true           | VARCHAR(10)          |
| MM_LFA1_NAME1    | MM_LFA1  | NAME1      | CHAR(35)   | 供应商名称（第一行） | false          | VARCHAR(35)          |
| MM_LFA1_STRAS    | MM_LFA1  | STRAS      | CHAR(30)   | 供应商街道地址       | false          | VARCHAR(30)          |
| MM_LFA1_ORT01    | MM_LFA1  | ORT01      | CHAR(30)   | 供应商城市           | false          | VARCHAR(30)          |
| MM_LFA1_BANKL    | MM_LFA1  | BANKL      | CHAR(15)   | 供应商银行代码       | false          | VARCHAR(15)          |
| MM_EKKO_EBELN    | MM_EKKO  | EBELN      | CHAR(10)   | 采购订单号           | true           | VARCHAR(10)          |
| MM_EKKO_EBELP    | MM_EKKO  | EBELP      |            |                      |                |                      |

> （注：文档部分内容可能由 AI 生成）
