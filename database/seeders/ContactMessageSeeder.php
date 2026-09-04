<?php

namespace Database\Seeders;

use App\Models\ContactMessage;
use Illuminate\Database\Seeder;

/**
 * 留言样例：覆盖 new / read / replied 三种状态，管理端收件箱的筛选与未读计数才有意义。
 */
class ContactMessageSeeder extends Seeder
{
    public function run(): void
    {
        ContactMessage::create([
            'name'       => '李慧敏',
            'email'      => 'lihm@huayuan-auto.example',
            'phone'      => '138-0000-1234',
            'company'    => '华远汽车零部件',
            'subject'    => '12 条产线的点位测绘',
            'message'    => '我们目前是 12 条产线、约 4000 个采集点位，想知道测绘阶段需要我们这边配合到什么程度，'
                . '以及能不能先只做其中 2 条线做对比。',
            'status'     => 'new',
            'handled_at' => null,
        ]);

        ContactMessage::create([
            'name'       => '周涛',
            'email'      => 'zhoutao@mingnuan-food.example',
            'phone'      => null,
            'company'    => '明暖食品包装',
            'subject'    => '换型时间优化',
            'message'    => '看到画册里食品包装线换型 40 分钟的案例，我们的情况类似但包材规格更多，想约一次线上沟通。',
            'status'     => 'read',
            'handled_at' => now()->subDays(4),
        ]);

        ContactMessage::create([
            'name'       => '陈立',
            'email'      => 'chenli@songjiang-cement.example',
            'phone'      => '137-0000-8899',
            'company'    => '松江水泥',
            'subject'    => '主轴承预警咨询',
            'message'    => '窑系统主轴承去年出过一次事故，想了解提前预警的准确率与误报情况。',
            'status'     => 'replied',
            'handled_at' => now()->subDays(2),
        ]);
    }
}
