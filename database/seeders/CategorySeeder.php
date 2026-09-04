<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * 三个演示分类：与 CatalogSeeder 的三本已发布画册一一对应。
 */
class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => '公司宣传', 'slug' => 'company',  'sort_order' => 1],
            ['name' => '产品手册', 'slug' => 'products', 'sort_order' => 2],
            ['name' => '服务案例', 'slug' => 'services', 'sort_order' => 3],
        ];

        foreach ($categories as $category) {
            Category::query()->firstOrCreate(['slug' => $category['slug']], $category);
        }
    }
}
