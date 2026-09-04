<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * 一键示例数据：composer setup（或 db:seed）后即可登录后台看到完整演示内容。
 *
 * 顺序即依赖：分类 → 画册（挂分类）→ 留言；站点基础资料由迁移自带默认行。
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // 管理账号：admin@forge.example / password（仅演示环境）
        User::factory()->create([
            'name'       => '演示管理员',
            'email'      => 'admin@forge.example',
            'password'   => 'password',
            'is_manager' => true,
        ]);

        $this->call([
            CategorySeeder::class,
            CatalogSeeder::class,
            ContactMessageSeeder::class,
        ]);
    }
}
