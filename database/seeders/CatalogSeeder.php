<?php

namespace Database\Seeders;

use App\Models\Catalog;
use App\Models\CatalogPage;
use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * 三本已发布画册 + 一本草稿，页面版式覆盖 PageFlip 支持的全部 6 种 layout。
 *
 * 图片字段一律留 null：本示例不内置版权素材，前台组件在 image 为空时按
 * theme_color + layout 生成装饰面板，填入真实 URL 后即切换为 <img>。
 */
class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        // 依赖 CategorySeeder 先行（DatabaseSeeder 保证顺序）
        $categoryIds = Category::query()->pluck('id', 'slug');

        $this->brandCatalog($categoryIds['company'] ?? null);
        $this->productCatalog($categoryIds['products'] ?? null);
        $this->serviceCatalog($categoryIds['services'] ?? null);
        $this->draftCatalog();
    }

    /**
     * @param  array<int, array{layout: string, title?: string|null, body?: string|null, tone?: string}>  $pages
     */
    private function make(array $attributes, array $pages): Catalog
    {
        $catalog = Catalog::create($attributes);

        foreach ($pages as $index => $page) {
            CatalogPage::create([
                'catalog_id' => $catalog->id,
                'sort_order' => $index + 1,
                'title'      => $page['title'] ?? null,
                'body'       => $page['body'] ?? null,
                'image'      => null,
                'layout'     => $page['layout'],
                'tone'       => $page['tone'] ?? 'light',
            ]);
        }

        return $catalog;
    }

    private function brandCatalog(?int $categoryId = null): void
    {
        $this->make(
            [
                'slug'         => 'xingye-brand-2026',
                'category_id'  => $categoryId,
                'title'        => '星野智能 · 2026 品牌画册',
                'subtitle'     => '把工业现场的数据，变成可执行的判断',
                'theme_color'  => '#1668ac',
                'summary'      => '星野智能成立于 2016 年，专注离散制造设备的实时数据采集与边缘推理。'
                    . '本画册用 8 页介绍我们的技术底座、交付方式与三家标杆客户案例。',
                'status'       => Catalog::STATUS_PUBLISHED,
                'published_at' => now()->subMonths(2),
                'sort_order'   => 1,
            ],
            [
                [
                    'layout'  => 'cover',
                    'title'   => '星野智能',
                    'body'    => '2026 品牌画册 / 边缘智能 · 工业现场',
                    'tone'    => 'dark',
                ],
                [
                    'layout' => 'text',
                    'title'  => '我们做什么',
                    'body'   => '工厂里最不缺的就是数据，最缺的是「当场能用的判断」。'
                        . '星野智能把采集、清洗、模型推理压进一台 1U 边缘盒子，'
                        . '让产线在 20 毫秒内决定这台设备该不该停机，而不是等明天早会再看报表。',
                ],
                [
                    'layout' => 'split',
                    'title'  => '技术底座',
                    'body'   => '三件事支撑起这套判断：47 种主流 PLC 与仪表协议的适配层；'
                        . '按点位质量自动降权的清洗规则；以及可在断网时独立运行的推理运行时。'
                        . '任何一件单独拿出来都不稀奇，难的是让它们在振动、粉尘与 55 ℃ 柜内温度下同时稳定工作。',
                ],
                [
                    'layout' => 'image',
                    'title'  => '产品矩阵',
                    'body'   => 'Edge-100 采集网关 / Edge-500 推理主机 / Studio 控制台 —— 一条从点位到决策的完整链路。',
                    'tone'   => 'dark',
                ],
                [
                    'layout' => 'quote',
                    'title'  => '客户评价',
                    'body'   => '上线第一个季度，我们的非计划停机次数从 17 次降到 4 次。'
                        . '最有价值的不是省下的钱，是工程师终于不用靠经验去猜了。',
                ],
                [
                    'layout' => 'split',
                    'title'  => '交付方式',
                    'body'   => '现场只做三周：一周测绘点位，两周并联调试，第三周与班组一起跑真实排产。'
                        . '我们不交付「大屏」，交付的是一条被班组接受的工作流 —— 验收标准写在合同里：连续 20 个工作日自动产生可追踪的处置单。',
                ],
                [
                    'layout' => 'text',
                    'title'  => '三家标杆案例',
                    'body'   => '汽车零部件厂 12 条产线，综合效率提升 8.4%；'
                        . '食品包装线，把换型调试时间从 4 小时压到 40 分钟；'
                        . '水泥窑系统，用尾气与振动联合特征提前 90 分钟预警主轴承异常。',
                ],
                [
                    'layout' => 'back',
                    'title'  => '继续聊',
                    'body'   => '如果你也有一处「数据很多、判断很少」的现场，欢迎联系我们约一次免费点位测绘。',
                    'tone'   => 'dark',
                ],
            ],
        );
    }

    private function productCatalog(?int $categoryId = null): void
    {
        $this->make(
            [
                'slug'         => 'yunshu-products-2026',
                'category_id'  => $categoryId,
                'title'        => '云枢制造 · 精密结构件产品手册',
                'subtitle'     => '五轴加工中心群与全自动检测线',
                'theme_color'  => '#0f568f',
                'summary'      => '面向新能源与医疗设备的精密结构件供应商，'
                    . '年产能 240 万件，公差稳定在 ±0.005 mm。手册含设备清单、工艺能力与打样流程。',
                'status'       => Catalog::STATUS_PUBLISHED,
                'published_at' => now()->subMonths(5),
                'sort_order'   => 2,
            ],
            [
                [
                    'layout' => 'cover',
                    'title'  => '精密结构件',
                    'body'   => '云枢制造 / 2026 产品手册',
                    'tone'   => 'dark',
                ],
                [
                    'layout' => 'text',
                    'title'  => '车间概况',
                    'body'   => '两个恒温车间、21 台五轴加工中心、3 条全自动检测线，'
                        . '关键工序全程在线测量。所有量具按季度送计量院校准，数据可回溯到具体批次与机台。',
                ],
                [
                    'layout' => 'split',
                    'title'  => '工艺能力',
                    'body'   => '铝合金、不锈钢、钛合金与 PEEK 均可加工；薄壁件最小壁厚 0.3 mm，'
                        . '深腔比做到 1:8。表面处理线覆盖阳极氧化、钝化与特氟龙涂覆，厂内一次完成，不外协。',
                ],
                [
                    'layout' => 'image',
                    'title'  => '主力设备',
                    'body'   => '五轴立式加工中心 / 车铣复合 / 三次元与白光干涉检测 —— 加工与测量在同一物流线上流转。',
                    'tone'   => 'dark',
                ],
                [
                    'layout' => 'quote',
                    'title'  => '质量承诺',
                    'body'   => '首批交样 5 个工作日，量产批次的尺寸报告随货同行；'
                        . '任何一项超差，我们提供整批复检而不是抽检。',
                ],
                [
                    'layout' => 'back',
                    'title'  => '打样入口',
                    'body'   => '带上你的三维模型和受力说明，我们从工艺评审开始聊。',
                ],
            ],
        );
    }

    private function serviceCatalog(?int $categoryId = null): void
    {
        $this->make(
            [
                'slug'         => 'munan-services',
                'category_id'  => $categoryId,
                'title'        => '木南设计 · 品牌与空间服务介绍',
                'subtitle'     => '给实业公司做一遍能被读懂的表达',
                'theme_color'  => '#8a5a2b',
                'summary'      => '十二年只服务实业客户：从品牌语言、展厅动线到画册与官网，'
                    . '把工程师写得对的东西，变成客户看得懂的东西。',
                'status'       => Catalog::STATUS_PUBLISHED,
                'published_at' => now()->subMonths(8),
                'sort_order'   => 3,
            ],
            [
                [
                    'layout' => 'cover',
                    'title'  => '木南设计',
                    'body'   => '品牌与空间 / 服务介绍',
                    'tone'   => 'dark',
                ],
                [
                    'layout' => 'text',
                    'title'  => '我们解决的问题',
                    'body'   => '实业公司最常见的困境不是没有好东西，而是说不清：'
                        . '参数都对，客户却记不住；展厅很气派，走完一遍没人知道该买哪一款。',
                ],
                [
                    'layout' => 'split',
                    'title'  => '服务方式',
                    'body'   => '驻场两周做尽调，和工程师、销售、售后各聊一轮，'
                        . '再交出一份「谁在什么场景下为什么买单」的表达方案。画册、官网、展厅动线都是同一套逻辑的不同载体。',
                ],
                [
                    'layout' => 'quote',
                    'title'  => '一句行话',
                    'body'   => '别急着改设计，先改说明书。说明书改完，一半的设计问题自己就消失了。',
                ],
                [
                    'layout' => 'back',
                    'title'  => '合作开始于一次审计',
                    'body'   => '我们免费看三样东西：现有画册、官网首屏、销售开场白。看完给你三条能立刻改的建议。',
                ],
            ],
        );
    }

    /**
     * 草稿：验证前台与公开 API 都读不到（404 / 列表不含），管理端可见可编辑。
     */
    private function draftCatalog(): void
    {
        $this->make(
            [
                'slug'         => 'annual-2027-draft',
                'title'        => '年度画册 2027（编写中）',
                'subtitle'     => '内部草稿，尚未发布',
                'theme_color'  => '#072a45',
                'summary'      => '明年画册的骨架草稿，用于演示 draft 状态在前台不可见。',
                'status'       => Catalog::STATUS_DRAFT,
                'published_at' => null,
                'sort_order'   => 9,
            ],
            [
                ['layout' => 'cover', 'title' => '2027（草稿）', 'body' => '内容待补'],
                ['layout' => 'text', 'title' => '待写章节', 'body' => '这里先占位，正式排版前不对外。'],
            ],
        );
    }
}
